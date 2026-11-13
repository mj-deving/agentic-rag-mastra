import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ARTICLES } from "../scripts/fetch-corpus";
import { type Chunk, chunkArticle } from "../scripts/build-chunks";

const chunks: Chunk[] = JSON.parse(readFileSync("corpus/chunks.json", "utf8"));

describe("corpus", () => {
  test("covers at least six articles", () => {
    expect(new Set(chunks.map((c) => c.article)).size).toBeGreaterThanOrEqual(6);
  });

  test.each([...ARTICLES])("article %d: snapshot hash matches provenance", (article) => {
    const source = readFileSync(`corpus/sources/art-${article}.source.txt`);
    const provenance = JSON.parse(readFileSync(`corpus/sources/art-${article}.provenance.json`, "utf8"));
    expect(createHash("sha256").update(source).digest("hex")).toBe(provenance.sha256);
    expect(provenance.retrievalUrl).toStartWith("https://");
  });

  test("every chunk is a verbatim substring of its article snapshot", () => {
    for (const chunk of chunks) {
      const source = readFileSync(`corpus/sources/art-${chunk.article}.source.txt`, "utf8");
      expect(source.includes(chunk.text)).toBe(true);
    }
  });

  test("committed chunks equal a fresh rebuild", () => {
    const rebuilt = ARTICLES.flatMap((a) =>
      chunkArticle(a, readFileSync(`corpus/sources/art-${a}.source.txt`, "utf8")),
    );
    expect(rebuilt).toEqual(chunks);
  });

  test("chunk ids are unique and non-empty", () => {
    expect(new Set(chunks.map((c) => c.id)).size).toBe(chunks.length);
    for (const c of chunks) expect(c.text.length).toBeGreaterThan(20);
  });
});
