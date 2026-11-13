import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { loadGolden } from "../src/lib/golden";

const golden = loadGolden("golden/v1.jsonl");
const chunkIds = new Set<string>(
  JSON.parse(readFileSync("corpus/chunks.json", "utf8")).map((c: { id: string }) => c.id),
);

describe("golden set", () => {
  test("has at least 30 cases and at least 6 expected refusals", () => {
    expect(golden.length).toBeGreaterThanOrEqual(30);
    expect(golden.filter((c) => c.expected_outcome === "refused").length).toBeGreaterThanOrEqual(6);
  });

  test("covers every required tag", () => {
    const tags = new Set(golden.flatMap((c) => c.tags));
    for (const tag of ["single", "multi-hop", "numerical", "ambiguous", "out-of-corpus"]) {
      expect(tags.has(tag)).toBe(true);
    }
  });

  test("ids are unique", () => {
    expect(new Set(golden.map((c) => c.id)).size).toBe(golden.length);
  });

  test("every expected chunk exists in the corpus", () => {
    for (const c of golden) for (const id of c.expected_chunks) expect(chunkIds.has(id)).toBe(true);
  });

  test("answered cases expect chunks, refused cases expect none", () => {
    for (const c of golden) {
      if (c.expected_outcome === "answered") expect(c.expected_chunks.length).toBeGreaterThan(0);
      else expect(c.expected_chunks).toEqual([]);
    }
  });

  test("every expected fact appears in one of its expected chunks", () => {
    const chunks: { id: string; text: string }[] = JSON.parse(readFileSync("corpus/chunks.json", "utf8"));
    const text = new Map(chunks.map((c) => [c.id, c.text.toLowerCase()]));
    for (const c of golden) {
      for (const fact of c.expected_facts ?? []) {
        const found = fact
          .split("|")
          .some((alt) => c.expected_chunks.some((id) => text.get(id)?.includes(alt.toLowerCase())));
        if (!found) throw new Error(`${c.id}: fact "${fact}" not in its expected chunks`);
      }
    }
  });
});
