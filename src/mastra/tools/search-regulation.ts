import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { config } from "../../lib/config";
import { embed } from "../../lib/models";
import { vectorStore } from "../lib/vector-store";

export const SEARCH_TOOL_ID = "search-regulation";

export const searchRegulationTool = createTool({
  id: SEARCH_TOOL_ID,
  description:
    "Durchsucht wörtliche Auszüge der KI-Verordnung (EU) 2024/1689 (Artikel 4, 5, 6, 26, 50, 99, 113). " +
    "Liefert Textstellen mit chunkId. Für Fragen mit mehreren Teilen einmal pro Teilfrage aufrufen.",
  inputSchema: z.object({
    query: z.string().min(3).describe("Suchanfrage auf Deutsch, möglichst nah am Gesetzeswortlaut"),
  }),
  outputSchema: z.object({
    chunks: z.array(
      z.object({ chunkId: z.string(), article: z.number(), score: z.number(), text: z.string() }),
    ),
  }),
  execute: async ({ query }) => {
    const [vector] = await embed([query]);
    const results = await vectorStore.query({
      indexName: config.indexName,
      queryVector: vector as number[],
      topK: config.topK,
    });
    return {
      chunks: results.map((r) => ({
        chunkId: String(r.metadata?.chunkId),
        article: Number(r.metadata?.article),
        score: Number(r.score.toFixed(4)),
        text: String(r.metadata?.text),
      })),
    };
  },
});
