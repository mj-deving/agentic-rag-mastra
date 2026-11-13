import { mkdir, writeFile } from "node:fs/promises";
import { runEvals } from "@mastra/core/evals";
import { config } from "../src/lib/config";
import { type GoldenCase, loadGolden } from "../src/lib/golden";
import { embed } from "../src/lib/models";
import { mastra } from "../src/mastra";
import { vectorStore } from "../src/mastra/lib/vector-store";
import { citationGuard } from "../src/mastra/agents/regulation-agent";
import type { GuardBlock } from "../src/mastra/processors/citation-guard";
import { citationValidity } from "../src/lib/grading";
import {
  type GroundTruth,
  citationRecallScorer,
  citationValidityScorer,
  factCoverageScorer,
  refusalScorer,
} from "../src/mastra/scorers";

// Two stages over the same golden set:
//  1. Retrieval only (no LLM): does the top-k contain the expected chunks?
//  2. The real agent through Mastra's runEvals, with a hard gate and thresholds.
// Exits non-zero unless the verdict is "passed".

const THRESHOLDS = { refusal: 0.85, recall: 0.8, facts: 0.7 } as const;
const goldenPath = process.env.GOLDEN ?? "golden/v1.jsonl";
const golden = loadGolden(goldenPath);
const only = process.env.ONLY?.split(",");
const cases = only ? golden.filter((c) => only.includes(c.id)) : golden;

async function retrievalStage(items: GoldenCase[]) {
  const answerable = items.filter((c) => c.expected_outcome === "answered");
  const rows = [];
  for (const c of answerable) {
    const [vector] = await embed([c.question]);
    const hits = await vectorStore.query({
      indexName: config.indexName,
      queryVector: vector as number[],
      topK: config.topK,
    });
    const ids = hits.map((h) => String(h.metadata?.chunkId));
    const found = c.expected_chunks.filter((id) => ids.includes(id)).length;
    rows.push({ id: c.id, recall: found / c.expected_chunks.length, top: ids });
  }
  const mean = rows.reduce((s, r) => s + r.recall, 0) / Math.max(rows.length, 1);
  return { recallAtK: mean, k: config.topK, cases: rows };
}

type ItemRow = {
  id: string;
  tags: string[];
  expected: string;
  answer: string;
  scores: Record<string, number | null>;
  ms: number;
};

async function agentStage(items: GoldenCase[]) {
  const rows: ItemRow[] = [];
  // The guard fires inside generate(), before onItemComplete for the same item (concurrency 1).
  const guardBlocks: (GuardBlock & { id: string; expected: string })[] = [];
  let pendingBlock: GuardBlock | undefined;
  citationGuard.onViolation = (v) => {
    pendingBlock = v.detail as GuardBlock;
  };
  let started = Date.now();
  const result = await runEvals({
    target: mastra.getAgent("regulationAgent"),
    data: items.map((c) => ({
      input: c.question,
      groundTruth: {
        expectedOutcome: c.expected_outcome,
        expectedChunks: c.expected_chunks,
        expectedFacts: c.expected_facts,
      } satisfies GroundTruth,
    })),
    gates: [citationValidityScorer],
    scorers: [
      { scorer: refusalScorer, threshold: THRESHOLDS.refusal },
      { scorer: citationRecallScorer, threshold: THRESHOLDS.recall },
      { scorer: factCoverageScorer, threshold: THRESHOLDS.facts },
    ],
    concurrency: 1,
    onItemComplete: ({ item, targetResult, scorerResults }) => {
      const c = items.find((x) => x.question === item.input);
      const retrieved = new Set<string>();
      for (const tr of (targetResult.toolResults ?? []) as { payload?: { result?: { chunks?: { chunkId: string }[] } } }[]) {
        for (const chunk of tr.payload?.result?.chunks ?? []) retrieved.add(chunk.chunkId);
      }
      const scores: Record<string, number | null> = { "citation-validity": citationValidity(targetResult.text, retrieved) };
      if (pendingBlock !== undefined) {
        guardBlocks.push({ id: c?.id ?? "?", expected: c?.expected_outcome ?? "?", ...pendingBlock });
        pendingBlock = undefined;
      }
      for (const [key, value] of Object.entries(scorerResults ?? {})) {
        const score = (value as { score?: unknown })?.score;
        scores[key] = typeof score === "number" ? score : null;
      }
      rows.push({
        id: c?.id ?? "?",
        tags: c?.tags ?? [],
        expected: c?.expected_outcome ?? "?",
        answer: targetResult.text,
        scores,
        ms: Date.now() - started,
      });
      process.stdout.write(`${rows.length}/${items.length} ${c?.id} ${JSON.stringify(scores)}\n`);
      started = Date.now();
    },
  });
  return { result, rows, guardBlocks };
}

function table(headers: string[], body: (string | number)[][]): string {
  return [
    `| ${headers.join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

const pct = (n: number | undefined) => (n === undefined ? "–" : `${(n * 100).toFixed(1)} %`);

const retrieval = await retrievalStage(cases);
console.log(`retrieval recall@${retrieval.k}: ${pct(retrieval.recallAtK)}`);
if (process.env.RETRIEVAL_ONLY === "1") {
  for (const r of retrieval.cases.filter((x) => x.recall < 1)) console.log(`  miss ${r.id}: top ${r.top.join(", ")}`);
  process.exit(0);
}
const { result, rows, guardBlocks } = await agentStage(cases);

const stamp = new Date().toISOString();
const run = {
  stamp,
  model: config.chatModel,
  prompt: config.promptVersion,
  guard: config.guard,
  golden: goldenPath,
  embeddingModel: config.embeddingModel,
  topK: config.topK,
  cases: cases.length,
  thresholds: THRESHOLDS,
  verdict: result.verdict,
  scores: result.scores,
  gateResults: result.gateResults,
  thresholdResults: result.thresholdResults,
  notScorable: result.summary.notScorable,
  retrieval,
  guardBlocks,
  items: rows,
};

const failures = rows.filter((r) =>
  Object.values(r.scores).some((s) => s !== null && s < 1),
);
const byTag = [...new Set(rows.flatMap((r) => r.tags))].sort().map((tag) => {
  const tagged = rows.filter((r) => r.tags.includes(tag));
  const mean = (key: string) => {
    const vals = tagged.map((r) => r.scores[key]).filter((v): v is number => typeof v === "number");
    return vals.length === 0 ? undefined : vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  return [tag, tagged.length, pct(mean("citation-validity")), pct(mean("refusal-correctness")), pct(mean("citation-recall")), pct(mean("fact-coverage"))];
});

const md = `# Eval run ${stamp}

Model \`${config.chatModel}\`, prompt \`${config.promptVersion}\`, guard \`${config.guard}\`, golden \`${goldenPath}\`, embeddings \`${config.embeddingModel}\`, top-k ${config.topK}, ${cases.length} cases. Verdict: **${result.verdict}**.

## Aggregate

${table(
  ["metric", "score", "rule"],
  [
    ["retrieval recall@k (no LLM)", pct(retrieval.recallAtK), "tracked"],
    ["citation-validity", pct(result.gateResults?.find((g) => g.id === "citation-validity")?.score), "gate: must be 100 %"],
    ["refusal-correctness", pct(result.scores["refusal-correctness"]), `≥ ${pct(THRESHOLDS.refusal)}`],
    ["citation-recall", pct(result.scores["citation-recall"]), `≥ ${pct(THRESHOLDS.recall)}`],
    ["fact-coverage", pct(result.scores["fact-coverage"]), `≥ ${pct(THRESHOLDS.facts)}`],
  ],
)}

## By tag

${table(["tag", "n", "validity", "refusal", "recall", "facts"], byTag)}

## Guard replacements (${guardBlocks.length})

${guardBlocks.map((b) => `### ${b.id} (${b.expected})\n\ncited ${JSON.stringify(b.cited)}, retrieved ${JSON.stringify(b.retrieved)}\n\n> ${b.original.replace(/\n+/g, " ").slice(0, 600)}\n`).join("\n")}

## Cases below 1.0 (${failures.length})

${failures.map((r) => `### ${r.id} (${r.expected})\n\n${JSON.stringify(r.scores)}\n\n> ${r.answer.replace(/\n+/g, " ").slice(0, 600)}\n`).join("\n")}
`;

await mkdir("results", { recursive: true });
const set = goldenPath.replace(/^.*\//, "").replace(/\.jsonl$/, "");
const slug = `${stamp.slice(0, 10)}-${config.chatModel.replace(/[^a-z0-9]+/gi, "-")}-${config.promptVersion}${config.guard === "on" ? "-guard" : ""}-${set}`;
await writeFile(`results/${slug}.json`, `${JSON.stringify(run, null, 2)}\n`);
await writeFile(`results/${slug}.md`, md);
console.log(`\nverdict: ${result.verdict}\nwrote results/${slug}.{json,md}`);
process.exit(result.verdict === "passed" ? 0 : 1);
