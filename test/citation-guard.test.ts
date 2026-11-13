import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { MastraLanguageModelV2Mock, simulateReadableStream } from "@mastra/core/test-utils/llm-mock";
import { z } from "zod";
import { parseGuard } from "../src/lib/config";
import { REFUSAL_MARKER } from "../src/lib/grading";
import { CitationGuard, GUARD_FALLBACK, type GuardBlock } from "../src/mastra/processors/citation-guard";
import { SEARCH_TOOL_ID } from "../src/mastra/tools/search-regulation";

// The recorded qwen3:8b run (Art. 26 log retention) replayed through the guard, then the guard
// inside a real Agent.generate() with a mock model, so the replacement is proven on the path a
// caller sees, not only on the processor in isolation.
const fixture = JSON.parse(readFileSync("test/fixtures/agent-run-art26-logs.json", "utf8"));
const answer: string = fixture.text;

function runGuard(text: string) {
  const messages = JSON.parse(JSON.stringify(fixture.scoringData.output).replaceAll(answer, text));
  const blocks: GuardBlock[] = [];
  const guard = new CitationGuard();
  guard.onViolation = (v) => void blocks.push(v.detail as GuardBlock);
  // Only messages and result.text are read; the rest of the args is irrelevant to this processor.
  const args = { messages, result: { text }, state: {} } as unknown as Parameters<CitationGuard["processOutputResult"]>[0];
  return guard.processOutputResult(args).then((out) => {
    const assistant = out.filter((m) => m.role === "assistant");
    const finalText = assistant.flatMap((m) => m.content.parts).filter((p) => p.type === "text").map((p) => p.text).join("");
    return { finalText, blocks };
  });
}

describe("citation guard on the recorded run", () => {
  test("real answer with a retrieved citation passes unchanged", async () => {
    const { finalText, blocks } = await runGuard(answer);
    expect(finalText).toBe(answer);
    expect(blocks).toHaveLength(0);
  });

  test("citation of an existing but non-retrieved chunk is replaced", async () => {
    const { finalText, blocks } = await runGuard(answer.replace("[chunk:art26-p6]", "[chunk:art99-p3]"));
    expect(finalText).toBe(GUARD_FALLBACK);
    expect(blocks[0]?.cited).toEqual(["art99-p3"]);
    expect(blocks[0]?.retrieved).toContain("art26-p6");
    expect(blocks[0]?.original).toContain("[chunk:art99-p3]");
  });

  test("one bad citation among good ones is enough to replace", async () => {
    const { finalText } = await runGuard(`${answer} Zusatz. [chunk:art5-p1]`);
    expect(finalText).toBe(GUARD_FALLBACK);
  });

  test("uncited answer is replaced", async () => {
    const { finalText, blocks } = await runGuard(answer.replace(" [chunk:art26-p6]", ""));
    expect(finalText).toBe(GUARD_FALLBACK);
    expect(blocks[0]?.cited).toEqual([]);
  });

  test("a refusal without citations passes unchanged", async () => {
    const refusal = `${REFUSAL_MARKER} Dazu enthalten die abgerufenen Textstellen nichts.`;
    const { finalText, blocks } = await runGuard(refusal);
    expect(finalText).toBe(refusal);
    expect(blocks).toHaveLength(0);
  });
});

const chunks = fixture.scoringData.output
  .flatMap((m: { content: { parts: { type: string; toolInvocation?: { result?: unknown } }[] } }) => m.content.parts)
  .find((p: { type: string }) => p.type === "tool-invocation").toolInvocation.result;

const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 };

function agentAnswering(text: string) {
  const model = new MastraLanguageModelV2Mock({
    doGenerate: [
      {
        content: [{ type: "tool-call", toolCallId: "c1", toolName: "searchRegulationTool", input: '{"query":"Protokolle"}' }],
        finishReason: "tool-calls",
        usage,
        warnings: [],
      },
      { content: [{ type: "text", text }], finishReason: "stop", usage, warnings: [] },
    ],
  });
  const searchRegulationTool = createTool({
    id: SEARCH_TOOL_ID,
    description: "stub returning the recorded retrieval",
    inputSchema: z.object({ query: z.string() }),
    execute: async () => chunks,
  });
  return new Agent({ id: "t", name: "t", instructions: "t", model, tools: { searchRegulationTool }, outputProcessors: [new CitationGuard()] });
}

describe("citation guard inside Agent.generate()", () => {
  test("retrieved citation reaches the caller", async () => {
    expect((await agentAnswering(answer).generate("q")).text).toBe(answer);
  });

  test("non-retrieved citation never reaches the caller", async () => {
    const res = await agentAnswering(answer.replace("art26-p6", "art99-p3")).generate("q");
    expect(res.text).toBe(GUARD_FALLBACK);
  });
});

function streamingAgent(text: string) {
  const stream = (chunks: unknown[]) => ({ stream: simulateReadableStream({ chunks: chunks as never[] }) });
  const model = new MastraLanguageModelV2Mock({
    doStream: [
      stream([
        { type: "stream-start", warnings: [] },
        { type: "tool-call", toolCallId: "c1", toolName: "searchRegulationTool", input: '{"query":"Protokolle"}' },
        { type: "finish", finishReason: "tool-calls", usage },
      ]),
      stream([
        { type: "stream-start", warnings: [] },
        { type: "text-start", id: "t1" },
        // Split mid-citation, as a real model streams it.
        ...[text.slice(0, 20), text.slice(20, -8), text.slice(-8)].map((delta) => ({ type: "text-delta", id: "t1", delta })),
        { type: "text-end", id: "t1" },
        { type: "finish", finishReason: "stop", usage },
      ]),
    ],
  });
  const searchRegulationTool = createTool({
    id: SEARCH_TOOL_ID,
    description: "stub returning the recorded retrieval",
    inputSchema: z.object({ query: z.string() }),
    execute: async () => chunks,
  });
  return new Agent({ id: "s", name: "s", instructions: "s", model, tools: { searchRegulationTool }, outputProcessors: [new CitationGuard()] });
}

async function streamed(text: string) {
  const out = await streamingAgent(text).stream("q");
  let seen = "";
  for await (const part of out.fullStream) if (part.type === "text-delta") seen += part.payload.text;
  return { seen, final: await out.text };
}

describe("citation guard inside Agent.stream()", () => {
  test("retrieved citation streams through unchanged", async () => {
    const { seen, final } = await streamed(answer);
    expect(seen).toBe(answer);
    expect(final).toBe(answer);
  });

  test("no delta of a non-retrieved answer reaches the client", async () => {
    const tampered = answer.replace("art26-p6", "art99-p3");
    const { seen, final } = await streamed(tampered);
    expect(seen).toBe(GUARD_FALLBACK);
    expect(seen).not.toContain("sechs Monaten");
    expect(final).toBe(GUARD_FALLBACK);
  });
});

describe("GUARD flag", () => {
  test("on, off, unset; anything else throws", () => {
    expect(parseGuard("on")).toBe("on");
    expect(parseGuard("off")).toBe("off");
    expect(parseGuard(undefined)).toBe("on");
    expect(parseGuard("")).toBe("on");
    expect(() => parseGuard("OFF")).toThrow();
    expect(() => parseGuard("1")).toThrow();
  });
});
