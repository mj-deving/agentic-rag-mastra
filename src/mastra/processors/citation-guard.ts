import type { MastraDBMessage } from "@mastra/core/memory";
import type {
  ProcessOutputResultArgs,
  ProcessOutputStreamArgs,
  Processor,
  ProcessorViolation,
} from "@mastra/core/processors";
import type { ChunkType } from "@mastra/core/stream";
import { REFUSAL_MARKER, citationValidity, parseCitations } from "../../lib/grading";
import { retrievedChunkIds } from "../scorers";
import { SEARCH_TOOL_ID } from "../tools/search-regulation";

// The eval gate (citationValidity) moved into the answer path: before an answer reaches the caller,
// every [chunk:<id>] must have been retrieved in this run. A failing answer is replaced, not
// repaired: the guard cannot know which sentence the bad citation was meant to back, so the only
// answer it can stand behind is the refusal the agent is already allowed to give.
//
// generate() sees the result through processOutputResult. stream() would deliver text deltas
// before that hook runs, so processOutputStream holds every part from the first text part on and
// releases them, or the fallback, when the stream ends.

export const GUARD_FALLBACK = `${REFUSAL_MARKER} Die Antwort ließ sich nicht mit den abgerufenen Textstellen belegen und wurde zurückgehalten.`;

export type GuardBlock = { original: string; cited: string[]; retrieved: string[] };

// ponytail: Mastra's hold/flush key (`FLUSH_HELD_PARTS_KEY` in @mastra/core/processors/stream-reprocess,
// not re-exported in 1.82). test/citation-guard.test.ts streams through it, so a rename turns it red.
const FLUSH_HELD_PARTS = "__mastraFlushHeldParts";

type StreamState = { held: ChunkType[]; retrieved: Set<string>; reported?: boolean };

const isText = (p: ChunkType) => p.type === "text-start" || p.type === "text-delta" || p.type === "text-end";

/** Drops the text of every assistant message and puts the fallback into the last one. */
function replaceText(messages: MastraDBMessage[]): void {
  const assistant = messages.filter((m) => m.role === "assistant");
  for (const [i, message] of assistant.entries()) {
    const last = i === assistant.length - 1;
    const parts = message.content.parts.filter((p) => p.type !== "text");
    message.content.parts = last ? [...parts, { type: "text", text: GUARD_FALLBACK }] : parts;
    if (typeof message.content.content === "string") message.content.content = last ? GUARD_FALLBACK : "";
  }
}

export class CitationGuard implements Processor<"citation-guard"> {
  readonly id = "citation-guard" as const;
  readonly description = "Ersetzt Antworten mit nicht abgerufenen oder fehlenden Zitaten durch den Verweigerungs-Marker.";
  onViolation?: (violation: ProcessorViolation) => void | Promise<void>; // detail: GuardBlock

  private async report(state: Record<string, unknown>, text: string, retrieved: Set<string>) {
    if (state.reported) return;
    state.reported = true;
    const detail: GuardBlock = { original: text, cited: parseCitations(text), retrieved: [...retrieved] };
    await this.onViolation?.({ processorId: this.id, message: "citation not retrieved in this run", detail });
  }

  async processOutputStream({ part, state: raw }: ProcessOutputStreamArgs) {
    const state = raw as Partial<StreamState> & Record<string, unknown>;
    state.held ??= [];
    state.retrieved ??= new Set();
    if (part.type === "tool-result" && (part.payload.toolName === SEARCH_TOOL_ID || part.payload.toolName === "searchRegulationTool")) {
      const result = part.payload.result as { chunks?: { chunkId: string }[] } | undefined;
      for (const chunk of result?.chunks ?? []) state.retrieved.add(chunk.chunkId);
    }
    if (state.held.length === 0 && !isText(part)) return part;
    state.held.push(part);
    state[FLUSH_HELD_PARTS] = async ({ discard = false }: { discard?: boolean } = {}) => {
      const held = state.held ?? [];
      state.held = [];
      if (discard) return held.filter((p) => !isText(p));
      const text = held.map((p) => (p.type === "text-delta" ? p.payload.text : "")).join("");
      const retrieved = state.retrieved ?? new Set<string>();
      if (citationValidity(text, retrieved) === 1) return held;
      await this.report(state, text, retrieved);
      const first = held.find((p) => p.type === "text-start");
      const rest = held.filter((p) => !isText(p));
      if (first === undefined) return rest;
      const id = first.payload.id;
      const base = { runId: first.runId, from: first.from };
      return [
        first,
        { ...base, type: "text-delta", payload: { id, text: GUARD_FALLBACK } },
        { ...base, type: "text-end", payload: { id } },
        ...rest,
      ] as ChunkType[];
    };
    return null;
  }

  async processOutputResult({ messages, result, state }: ProcessOutputResultArgs) {
    const retrieved = retrievedChunkIds(messages);
    if (!state.reported && citationValidity(result.text, retrieved) === 1) return messages;
    await this.report(state, result.text, retrieved);
    replaceText(messages);
    return messages;
  }
}
