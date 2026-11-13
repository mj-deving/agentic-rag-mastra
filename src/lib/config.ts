import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// `mastra dev` runs the bundle from src/mastra/public, so a cwd-relative path would silently open
// a second, empty database there. Walk up to the directory that holds the corpus instead.
function projectRoot(start: string): string {
  let dir = start;
  while (!existsSync(join(dir, "corpus", "chunks.json"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no corpus/chunks.json above ${start}; set DB_URL`);
    dir = parent;
  }
  return dir;
}

/** GUARD=on|off; unset means on. Anything else throws, so a typo never silently picks a mode. */
export function parseGuard(value: string | undefined): "on" | "off" {
  if (value === undefined || value === "" || value === "on") return "on";
  if (value === "off") return "off";
  throw new Error(`GUARD must be "on" or "off", got "${value}"`);
}

// One place for every tunable. Environment variables override the local defaults.
export const config = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/api",
  chatModel: process.env.CHAT_MODEL ?? "qwen3:8b",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "bge-m3",
  embeddingDimension: 1024,
  dbUrl: process.env.DB_URL ?? `file:${join(projectRoot(process.cwd()), "mastra.db")}`,
  indexName: "eu_ai_act_chunks",
  topK: Number(process.env.TOP_K ?? 5),
  guard: parseGuard(process.env.GUARD),
  promptVersion: (process.env.PROMPT === "v1" ? "v1" : "v2") as "v1" | "v2",
} as const;
