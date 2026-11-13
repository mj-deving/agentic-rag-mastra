<div align="center">

# Agentic RAG on Mastra

**A Mastra agent that answers questions about the EU AI Act only from retrieved paragraphs, cites every claim, refuses when the corpus is silent, and is graded by a deterministic eval gate. Fully local: no API key, no cloud.**

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.4-000000?logo=bun&logoColor=white)
![Mastra](https://img.shields.io/badge/Mastra-1.x-111827)
![Ollama](https://img.shields.io/badge/LLM-local_Ollama-0f766e)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

[Quickstart](#quickstart) · [Architecture](#architecture) · [Results](#results) · [What Mastra gives you, and what it doesn't](#what-mastra-gives-you-and-what-it-doesnt)

</div>

## Why this exists

Most RAG demos show a pleasant answer box. In regulated work the question is different: *which
paragraph says so, and what happens when no paragraph does?* This repo answers questions about
Regulation (EU) 2024/1689 (the EU AI Act) with three hard rules:

1. Every statement carries a citation like `[chunk:art50-p4]`.
2. A citation is only valid if that chunk was retrieved **in the same run**.
3. If the retrieved text does not support an answer, the agent returns `[KEINE_GRUNDLAGE]` instead of guessing.

It is a companion to [audit-grade-rag](https://github.com/mj-deving/audit-grade-rag), which builds the
same guarantees by hand. This one builds them on an agent framework and measures what that buys.

## Quickstart

Requires [Bun](https://bun.sh) ≥ 1.4 and [Ollama](https://ollama.com).

```bash
ollama pull qwen3:8b
ollama pull bge-m3
bun install
bun run ingest        # embeds 66 paragraphs into a local LibSQL vector index
bun run ask "Welche Geldbuße droht bei Verstößen gegen die Transparenzpflichten nach Artikel 50?"
bun run eval          # 40 golden cases through the real agent, writes results/
GUARD=off bun run eval  # same, without the citation guard in the answer path
bun run dev           # Mastra Studio: agent, workflow, traces
```

`bun run check` (typecheck plus unit tests) needs neither Ollama nor network and is what CI runs.

## Architecture

The layout follows the official Mastra templates (`mastra-ai/template-chat-with-pdf`).

```
corpus/sources/*.source.txt   verbatim article snapshots + provenance (URL, date, SHA-256)
corpus/chunks.json            66 paragraph chunks, each a verbatim substring of its snapshot
golden/v1.jsonl               40 hand-written cases: single, multi-hop, numerical, ambiguous, out-of-corpus
src/mastra/
  workflows/ingest-corpus.ts  load chunks → embed with bge-m3 → idempotent upsert (chunk id = vector id)
  tools/search-regulation.ts  top-k vector search, returns chunkId + text
  agents/regulation-agent.ts  qwen3:8b, temperature 0, citation and refusal contract
  processors/citation-guard.ts output processor: replaces an answer whose citations were not retrieved
  scorers/index.ts            Mastra scorers, thin adapters over src/lib/grading.ts
  index.ts                    Mastra instance: storage, local traces, optional Langfuse
src/lib/grading.ts            pure, deterministic grading logic (unit-tested)
scripts/eval.ts               retrieval-only stage + agent stage via runEvals with gate and thresholds
```

**Corpus.** Articles 4, 5, 6, 26, 50, 99 and 113, fetched by `scripts/fetch-corpus.ts`. The snapshot
is a mirror's rendering of the consolidated text, not the Official Journal (EUR-Lex refuses
non-browser clients), so each provenance file names the exact URL and retrieval date. The mirror
already shows later amendments, for example application dates for high-risk systems of
2 December 2027 and 2 August 2028 in Article 113. Answers are about this snapshot. This is not legal advice.

**Grading.** Four scorers, all deterministic:

| Scorer | Rule | Role |
|---|---|---|
| `citation-validity` | every cited chunk was retrieved in this run, and no answer is uncited | **gate**: must be 100 % |
| `refusal-correctness` | refuses exactly when the case expects it | threshold |
| `citation-recall` | share of expected chunks the answer cites | threshold |
| `fact-coverage` | share of expected facts (amounts, dates, key terms) present | threshold |

## Results

All numbers come from the files in [`results/`](results/), produced by `bun run eval` on a MacBook
with `qwen3:8b` and `bge-m3` through Ollama, top-k 5, temperature 0.

| Run | Set | Citation gate | Refusal correct | Out-of-corpus refused | Citation recall | Fact coverage | Verdict |
|---|---|---|---|---|---|---|---|
| prompt v1 | golden (40) | 95.0 % | 92.5 % | 4 / 7 | 87.9 % | 93.9 % | ❌ failed |
| prompt v2 | golden (40) | 95.0 % | 87.5 % | 4 / 7 | 91.9 % | 87.1 % | ❌ failed |
| prompt v1 | held-out (8) | 100 % | 37.5 % | 0 / 4 | 100 % | 100 % | 🟡 scored |
| prompt v2 | held-out (8) | 100 % | 62.5 % | 2 / 4 | 100 % | 100 % | 🟡 scored |
| prompt v2 + guard | golden (40) | 100 %¹ | 82.5 % | 4 / 7 | 94.8 % | 93.1 % | 🟡 scored |
| prompt v2 + guard | held-out (8) | 100 %¹ | 50.0 % | 1 / 4 | 100 % | 100 % | 🟡 scored |

¹ With the guard on, the gate holds by construction: a failing answer is replaced before it is scored.
The numbers that matter are how often the guard fired and what it replaced, below.

Retrieval alone (no LLM, full question as query): recall@3 90.9 %, recall@5 93.9 %, recall@8 98.5 %.

**How to read this.** The gate failed for good reasons. In each golden run it caught two answers a
reader should never see. With prompt v1, both cited `[chunk:art5-p1]`, an id that does not exist
(the model shortened `art5-p1-c`). With prompt v2, one stated a date of "17. Mai 2026" backed by a
chunk that was never retrieved, and one invented a definition. The eval exits non-zero, which is the
point of a gate.

The weak spot is refusal. On questions the corpus cannot answer, the 8B model still answers about
half the time, citing paragraphs that were retrieved but do not support the claim (it asserted that
Article 4 defines "KI-System"). Prompt v2 was written after reading v1's failures, so its effect is
judged on the held-out set, written before v2 ran: out-of-corpus refusals there rose from 0 of 4 to
2 of 4, while two answerable golden questions were wrongly refused. A prompt is a weak lever here.

Recall and fact coverage are only scored on answered cases, so a wrong refusal drops out of their
denominator instead of counting as zero. Counted as zero, prompt v2 reaches 86.4 % citation recall
and 81.8 % fact coverage on the golden set, below v1 (87.9 % and 93.9 %, which had no wrong
refusals). The apparent recall gain of v2 in the table is that artifact.

**The guard in the answer path.** `src/mastra/processors/citation-guard.ts` is a Mastra output
processor. Before an answer reaches the caller, it applies the same rule as the gate to the final
text and the chunks the search tool returned in that run. If any citation was not retrieved, or the
answer cites nothing and is not a refusal, the answer is replaced by `[KEINE_GRUNDLAGE]` plus one
sentence saying it was withheld. Replace, not repair: the guard cannot tell which sentence a bad
citation was meant to back, and the refusal is the one answer the contract already allows. It
covers both paths: `generate()` (`bun run ask`, the eval) through `processOutputResult`, and
`stream()` (Studio chat) through `processOutputStream`, which holds the text until the stream ends
and then releases either the answer or the fallback, so no delta of a blocked answer reaches the
client. The price on the streaming path is that answers no longer arrive token by token.
`GUARD=off` turns it off.

In the guarded runs it fired **2 times in 48 cases** (2 of 40 golden, 0 of 8 held-out). Both were
true catches:

- `a113-application`: asked when the regulation applies, the model skipped the search tool and
  answered "17. Mai 2026" with a citation to an unrelated transparency paragraph (correct: 2 August
  2026). The unguarded v2 run let the same answer through.
- `a5-emotion-workplace`: the model cited `art5-p1`, an id that does not exist (it shortened the
  retrieved `art5-p1-f`), and turned the prohibition upside down: an employer *may* use emotion
  recognition unless it is for medical reasons. The unguarded v2 run answered this question
  correctly, so this failure is run-to-run variance that the guard happened to catch.

Wrongly blocked good answers: **0**. Correct answers lost: **0**. The cost shows up in the metrics,
not in correctness. Both replaced answers expected an answer, so each wrong answer became a wrong
refusal: refusal correctness is 82.5 % against 87.5 % unguarded, and exactly these two cases make the
difference (the model's own wrong refusals and the 4 / 7 out-of-corpus refusals match the unguarded
run). The inverted emotion answer contained the expected fact word "medizinischen", so unguarded it
would have counted as a fact hit: strictly counted (wrong refusal = 0), fact coverage is 81.8 %, and
would read 84.8 % with that inverted answer let through. Strict citation recall is 83.3 % against
86.4 % unguarded; both replaced answers had recall 0 either way, so that gap is run-to-run variance.
The held-out set scores 75.0 % strict on both, unchanged.

The guard checks provenance, not support. The emotion case was caught because of the shortened id;
the same inverted claim with a correct id would have passed, as do answers that cite a retrieved but
irrelevant paragraph (the "Article 4 defines KI-System" case). An earlier guarded run, with the
`generate()` hook only and since overwritten in `results/`, fired once, on the same `a113` case.
Two catches in 48 cases show the mechanism works on real failures; they are not a rate.

**What did not work.** A similarity floor as a refusal gate: top-1 cosine for answerable questions
starts at 0.561, for out-of-corpus questions it reaches 0.592. The distributions overlap, so a
threshold would trade wrong answers for wrong refusals. It was measured and not built.

**Run-to-run variance.** An earlier full run of prompt v1, before a grader fix that did not touch the
gate, scored the gate at 100 %; the repeat in `results/` scored 95 %, with the same prompt, model and
temperature 0 (its result file was replaced after the grader fix, so it is not in `results/`). Small local models are not deterministic
enough to treat one run as the truth; n = 40 is a regression check, not a benchmark.

## What Mastra gives you, and what it doesn't

**What it gave me for free:** the agent loop with tool calling, typed tools with Zod schemas, a
workflow engine for ingestion, a vector store abstraction, `runEvals` with gates, thresholds and a
verdict, scorers that can be replayed against stored runs, and a span tree for every run
(`agent_run → llm → tool_call → text`) without writing tracing code. Swapping Ollama for a hosted
model is one line.

**What I had to add, because no framework knows it:**

- **The definition of a valid answer.** Mastra can check that a tool was called. Only I can say that
  a citation must point to a chunk retrieved in the same run, and that an uncited answer is a
  failure. That rule lives in `src/lib/grading.ts` and is unit-tested against a recorded real run,
  including tampered citations.
- **Provenance.** Verbatim chunks with hashes and source URLs, so a citation points to text that can be
  checked.
- **Held-out discipline.** The framework will happily let you tune a prompt on the set you report.
- **Detection is not prevention.** The gate catches bad answers in CI; the same rule also has to sit
  in the answer path. Mastra provides the hook (output processors); the rule and the decision to
  replace rather than repair are mine, and are unit-tested on the recorded run and inside a real
  `Agent.generate()` with a mock model (`test/citation-guard.test.ts`).

**Rough edges found while building:**

- `mastra dev` runs from `src/mastra/public`, so a cwd-relative LibSQL path silently opens a second,
  empty database. The agent then refuses everything. Fixed by resolving the path from the project root
  (`src/lib/config.ts`).
- In `@mastra/core` 1.82.0 with LibSQL storage, Studio's trace list fails with `stored.trim is not a
  function` (`lightPreview` in the light-traces path). Traces are stored and complete; read them via
  `GET /api/observability/traces/<traceId>` until this is fixed upstream.
- `ollama-ai-provider-v2` ships its own copy of the AI SDK provider types, so TypeScript needs one
  cast at the model boundary (`src/lib/models.ts`). The runtime contract matches.

## Next steps

- A stronger judge for groundedness (does the cited text support the claim), kept as a tracked metric, not a gate.
- Repeat each run five times and report the spread instead of one number.

## License

Apache-2.0. Regulation text: Regulation (EU) 2024/1689, reusable under Commission Decision 2011/833/EU with attribution.
