import { createScorer } from "@mastra/core/evals";
import { notScorable } from "@mastra/core/evals";
import { extractToolResults, getAssistantMessageFromRunOutput } from "@mastra/evals/scorers/utils";
import {
  type ExpectedOutcome,
  citationRecall,
  citationValidity,
  factCoverage,
  refusalCorrectness,
} from "../../lib/grading";
import { SEARCH_TOOL_ID } from "../tools/search-regulation";

// Mastra scorers are thin adapters: they pull the answer text, the retrieved chunk ids and the
// golden truth out of the agent run, then call the pure functions in src/lib/grading.ts.

export type GroundTruth = {
  expectedOutcome: ExpectedOutcome;
  expectedChunks: string[];
  expectedFacts?: string[];
};

type AgentRun = { output: Parameters<typeof extractToolResults>[0]; groundTruth?: unknown };

function answerOf(run: AgentRun): string {
  return getAssistantMessageFromRunOutput(run.output) ?? "";
}

/** Chunk ids returned by the search tool anywhere in this run's response messages. */
export function retrievedChunkIds(messages: AgentRun["output"]): Set<string> {
  const ids = new Set<string>();
  for (const result of extractToolResults(messages)) {
    if (result.toolName !== SEARCH_TOOL_ID && result.toolName !== "searchRegulationTool") continue;
    for (const chunk of result.result?.chunks ?? []) ids.add(String(chunk.chunkId));
  }
  return ids;
}

function truthOf(run: AgentRun): GroundTruth {
  const truth = run.groundTruth as GroundTruth | undefined;
  if (truth === undefined) throw new Error("scorer needs groundTruth");
  return truth;
}

export const citationValidityScorer = createScorer({
  id: "citation-validity",
  description: "1, wenn jede zitierte chunkId im selben Lauf abgerufen wurde und keine Antwort unzitiert bleibt.",
  type: "agent",
}).generateScore(({ run }) => citationValidity(answerOf(run), retrievedChunkIds(run.output)));

export const refusalScorer = createScorer({
  id: "refusal-correctness",
  description: "1, wenn der Agent genau dann verweigert, wenn das Golden Set eine Verweigerung erwartet.",
  type: "agent",
}).generateScore(({ run }) => refusalCorrectness(truthOf(run).expectedOutcome, answerOf(run)));

export const citationRecallScorer = createScorer({
  id: "citation-recall",
  description: "Anteil der erwarteten Chunks, die die Antwort zitiert.",
  type: "agent",
}).generateScore(({ run }) => citationRecall(truthOf(run).expectedChunks, answerOf(run)) ?? notScorable());

export const factCoverageScorer = createScorer({
  id: "fact-coverage",
  description: "Anteil der erwarteten Fakten (Zahlen, Fristen, Schlüsselbegriffe) in der Antwort.",
  type: "agent",
}).generateScore(({ run }) => factCoverage(truthOf(run).expectedFacts, answerOf(run)) ?? notScorable());
