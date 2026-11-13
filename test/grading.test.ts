import { describe, expect, test } from "bun:test";
import {
  REFUSAL_MARKER,
  citationRecall,
  citationValidity,
  factCoverage,
  isRefusal,
  normalize,
  parseCitations,
  refusalCorrectness,
} from "../src/lib/grading";

const retrieved = new Set(["art50-p1", "art50-p4", "art99-p3"]);

describe("parseCitations", () => {
  test("dedupes and keeps first-seen order", () => {
    expect(parseCitations("A [chunk:art50-p4] B [chunk:art50-p1] C [chunk:art50-p4]")).toEqual([
      "art50-p4",
      "art50-p1",
    ]);
  });
  test("ignores look-alikes that are not the citation syntax", () => {
    expect(parseCitations("Artikel 50 Absatz 1, chunk:art50-p1, [Chunk:art50-p1], [chunk: art50-p1]")).toEqual(
      [],
    );
  });
});

describe("citationValidity", () => {
  test("every cited chunk retrieved -> 1", () => {
    expect(citationValidity("X [chunk:art50-p1] Y [chunk:art99-p3]", retrieved)).toBe(1);
  });
  test("one cited chunk not retrieved -> 0, even if the id exists in the corpus", () => {
    expect(citationValidity("X [chunk:art50-p1] Y [chunk:art26-p6]", retrieved)).toBe(0);
  });
  test("invented id -> 0", () => {
    expect(citationValidity("X [chunk:art999-p1]", retrieved)).toBe(0);
  });
  test("uncited answer -> 0", () => {
    expect(citationValidity("Ja, das ist Pflicht.", retrieved)).toBe(0);
  });
  test("refusal without citations -> 1", () => {
    expect(citationValidity(`${REFUSAL_MARKER} Dazu steht nichts im Korpus.`, retrieved)).toBe(1);
  });
  test("empty retrieval and an uncited answer -> 0", () => {
    expect(citationValidity("Antwort", new Set())).toBe(0);
  });
});

describe("refusalCorrectness", () => {
  test.each([
    ["refused", REFUSAL_MARKER, 1],
    ["refused", "Antwort [chunk:art50-p1]", 0],
    ["answered", "Antwort [chunk:art50-p1]", 1],
    ["answered", REFUSAL_MARKER, 0],
  ] as const)("%s / %s -> %d", (expected, answer, score) => {
    expect(refusalCorrectness(expected, answer)).toBe(score);
  });
  test("marker must be exact", () => {
    expect(isRefusal("[keine_grundlage]")).toBe(false);
  });
});

describe("citationRecall", () => {
  test("partial multi-hop recall", () => {
    expect(citationRecall(["art26-p11", "art50-p1"], "A [chunk:art50-p1]")).toBe(0.5);
  });
  test("extra citations do not lower recall", () => {
    expect(citationRecall(["art50-p1"], "A [chunk:art50-p1] [chunk:art50-p4]")).toBe(1);
  });
  test("not scorable for refusal cases and wrong refusals", () => {
    expect(citationRecall([], "A")).toBeNull();
    expect(citationRecall(["art50-p1"], REFUSAL_MARKER)).toBeNull();
  });
});

describe("factCoverage", () => {
  test("thousands separators and alternatives", () => {
    const facts = ["35000000|35 Millionen", "7 %|7 Prozent"];
    expect(factCoverage(facts, "bis zu 35.000.000 EUR oder 7 % des Umsatzes")).toBe(1);
    expect(factCoverage(facts, "bis zu 35 Millionen Euro")).toBe(0.5);
  });
  test("case-insensitive", () => {
    expect(factCoverage(["Arbeitnehmervertreter"], "die ARBEITNEHMERVERTRETER")).toBe(1);
  });
  test("not scorable without facts or on refusal", () => {
    expect(factCoverage(undefined, "x")).toBeNull();
    expect(factCoverage(["x"], REFUSAL_MARKER)).toBeNull();
  });
  test("normalize keeps ordinary numbers apart", () => {
    expect(normalize("2. August 2026")).toBe("2. august 2026");
  });
});
