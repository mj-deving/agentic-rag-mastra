import { readFileSync } from "node:fs";
import { z } from "zod";

export const GoldenCase = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  expected_outcome: z.enum(["answered", "refused"]),
  expected_chunks: z.array(z.string()),
  expected_facts: z.array(z.string()).optional(),
  tags: z.array(z.string()).min(1),
});
export type GoldenCase = z.infer<typeof GoldenCase>;

export function loadGolden(path: string): GoldenCase[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line, i) => {
      const parsed = GoldenCase.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`${path}:${i + 1}: ${parsed.error.message}`);
      return parsed.data;
    });
}
