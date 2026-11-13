import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Fetches the German text of selected articles of Regulation (EU) 2024/1689 and writes one source
// snapshot plus a provenance record per article. Chunks are cut from these snapshots by
// scripts/build-chunks.ts, and test/corpus.test.ts asserts every chunk is a verbatim substring.
//
// Adapted from audit-grade-rag (scripts/fetch-corpus-source.ts, Apache-2.0, same author).
// The snapshot is a mirror's rendering, not the Official Journal: EUR-Lex answers 202 to
// non-browser clients, so the provenance names the exact URL and date instead.
// Not run in CI (network). Usage: bun scripts/fetch-corpus.ts

export const ARTICLES = [4, 5, 6, 26, 50, 99, 113] as const;

const sourceBaseUrl = "https://gesetze.legal/eu/vo_eu_2024_1689";
const sourcesDir = "corpus/sources";
const bodyEndMarker = "© Europäische Union";

const namedEntities = new Map<string, string>([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
]);

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/gu, (_m, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/giu, (_m, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/giu, (m, name: string) => namedEntities.get(name.toLowerCase()) ?? m);
}

// Most articles open at their first numbered paragraph; Article 113 has none.
const startPatterns: Readonly<Record<number, RegExp>> = { 113: /Diese Verordnung tritt/u };

export function extractArticleBody(pageHtml: string, article = 0): string {
  const stripped = pageHtml
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ");
  const text = decodeEntities(stripped).replace(/\s+/gu, " ");
  const start = text.search(startPatterns[article] ?? /\(1\)\s/u);
  const end = text.indexOf(bodyEndMarker, start);
  if (start < 0) throw new Error(`article ${article}: body start marker not found`);
  if (end < 0 || end <= start) throw new Error(`article body end marker '${bodyEndMarker}' not found`);
  const body = text.slice(start, end).trim();
  // Fail closed on an unknown entity: it would be cited to a reader as regulation text.
  const residual = /&[a-z]+;|&#\d+;/iu.exec(body);
  if (residual !== null) throw new Error(`undecoded HTML entity: ${residual[0]}`);
  return body;
}

async function main(): Promise<void> {
  await mkdir(sourcesDir, { recursive: true });
  const retrievedAt = new Date().toISOString().slice(0, 10);
  for (const article of ARTICLES) {
    const url = `${sourceBaseUrl}/${article}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
    const body = extractArticleBody(await response.text(), article);
    const slug = `art-${article}`;
    await writeFile(join(sourcesDir, `${slug}.source.txt`), `${body}\n`);
    const sha256 = createHash("sha256").update(`${body}\n`).digest("hex");
    const provenance = {
      regulation: "Verordnung (EU) 2024/1689",
      article,
      language: "de",
      retrievalUrl: url,
      retrievedAt,
      sha256,
      note: "Mirror rendering, not the Official Journal. Re-derive by re-running this script and comparing sha256.",
    };
    await writeFile(join(sourcesDir, `${slug}.provenance.json`), `${JSON.stringify(provenance, null, 2)}\n`);
    console.log(`${slug}: ${body.length} chars, sha256 ${sha256.slice(0, 12)}`);
  }
}

if (import.meta.main) await main();
