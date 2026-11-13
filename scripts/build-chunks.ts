import { readFile, writeFile } from "node:fs/promises";
import { ARTICLES } from "./fetch-corpus";

// Cuts each source snapshot into paragraph chunks. Every chunk is a slice of the snapshot, never a
// rewrite, so test/corpus.test.ts can assert it is a verbatim substring. Paragraphs longer than
// MAX_CHARS are split further at their lettered items ("a) ", "ba) "), which keeps each enumerated
// prohibition or exception retrievable on its own.
// Usage: bun scripts/build-chunks.ts

export type Chunk = {
  readonly id: string;
  readonly article: number;
  readonly text: string;
};

const MAX_CHARS = 1800;

function sliceAt(text: string, pattern: RegExp): string[] {
  const starts = [0];
  for (const match of text.matchAll(pattern)) {
    if (match.index !== undefined && match.index > 0) starts.push(match.index);
  }
  return starts.map((start, i) => text.slice(start, starts[i + 1] ?? text.length).trim());
}

export function chunkArticle(article: number, source: string): Chunk[] {
  const body = source.trim();
  // A paragraph opens with "(1) ", "(1a) " at the start or after a sentence end.
  const paragraphs = sliceAt(body, /(?<=[.;:] )\((\d+[a-z]?)\) /gu);
  const chunks: Chunk[] = [];
  for (const paragraph of paragraphs) {
    const label = /^\((\d+[a-z]?)\) /u.exec(paragraph)?.[1] ?? "0";
    const base = `art${article}-p${label}`;
    if (paragraph.length <= MAX_CHARS) {
      chunks.push({ id: base, article, text: paragraph });
      continue;
    }
    // Roman sub-items (i), ii) ...) stay inside their lettered item.
    const items = sliceAt(paragraph, /(?<=[;:] )(?!(?:i{1,3}|iv|vi{0,3})\) )(?=[a-z]{1,2}\) )/gu);
    for (const [i, item] of items.entries()) {
      const letter = /^([a-z]{1,2})\) /u.exec(item)?.[1];
      chunks.push({ id: letter === undefined ? `${base}-${i}` : `${base}-${letter}`, article, text: item });
    }
  }
  return chunks;
}

async function main(): Promise<void> {
  const all: Chunk[] = [];
  for (const article of ARTICLES) {
    const source = await readFile(`corpus/sources/art-${article}.source.txt`, "utf8");
    all.push(...chunkArticle(article, source));
  }
  const ids = new Set(all.map((c) => c.id));
  if (ids.size !== all.length) throw new Error("duplicate chunk ids");
  await writeFile("corpus/chunks.json", `${JSON.stringify(all, null, 2)}\n`);
  console.log(`${all.length} chunks, max ${Math.max(...all.map((c) => c.text.length))} chars`);
}

if (import.meta.main) await main();
