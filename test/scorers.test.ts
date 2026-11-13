import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { citationValidityScorer, factCoverageScorer, refusalScorer } from "../src/mastra/scorers";

// A real agent run (qwen3:8b, recorded once), replayed offline. This proves the Mastra scorer
// adapters read the actual message shape the agent produces, not a hand-built approximation.
const fixture = JSON.parse(readFileSync("test/fixtures/agent-run-art26-logs.json", "utf8"));
const { input, output } = fixture.scoringData;

function withAnswerReplaced(from: string, to: string) {
  return JSON.parse(JSON.stringify(output).replaceAll(from, to));
}

const truth = { expectedOutcome: "answered", expectedChunks: ["art26-p6"], expectedFacts: ["sechs Monat"] };

describe("Mastra scorers on a recorded agent run", () => {
  test("the recorded answer cites a retrieved chunk", async () => {
    expect(fixture.text).toContain("[chunk:art26-p6]");
    expect((await citationValidityScorer.run({ input, output })).score).toBe(1);
  });

  test("gate fails when the cited chunk exists in the corpus but was not retrieved", async () => {
    const tampered = withAnswerReplaced("[chunk:art26-p6]", "[chunk:art99-p3]");
    expect((await citationValidityScorer.run({ input, output: tampered })).score).toBe(0);
  });

  test("gate fails when the citation is removed", async () => {
    const tampered = withAnswerReplaced("[chunk:art26-p6]", "");
    expect((await citationValidityScorer.run({ input, output: tampered })).score).toBe(0);
  });

  test("refusal and fact scorers read groundTruth", async () => {
    expect((await refusalScorer.run({ input, output, groundTruth: truth })).score).toBe(1);
    expect(
      (await refusalScorer.run({ input, output, groundTruth: { ...truth, expectedOutcome: "refused" } })).score,
    ).toBe(0);
    expect((await factCoverageScorer.run({ input, output, groundTruth: truth })).score).toBe(1);
  });
});
