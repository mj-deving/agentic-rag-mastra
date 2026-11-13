import { readFile } from "node:fs/promises";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { config } from "../../lib/config";
import { embed } from "../../lib/models";
import { vectorStore } from "../lib/vector-store";

const ChunkSchema = z.object({ id: z.string(), article: z.number(), text: z.string() });

const loadChunks = createStep({
  id: "load-chunks",
  description: "Liest die committeten, wörtlichen Chunks aus corpus/chunks.json",
  inputSchema: z.object({ path: z.string().default("corpus/chunks.json") }),
  outputSchema: z.object({ chunks: z.array(ChunkSchema) }),
  execute: async ({ inputData }) => ({
    chunks: z.array(ChunkSchema).parse(JSON.parse(await readFile(inputData.path, "utf8"))),
  }),
});

const embedAndUpsert = createStep({
  id: "embed-and-upsert",
  description: "Embeddet die Chunks mit bge-m3 und schreibt sie idempotent in den LibSQL-Index",
  inputSchema: z.object({ chunks: z.array(ChunkSchema) }),
  outputSchema: z.object({ indexed: z.number(), indexName: z.string() }),
  execute: async ({ inputData }) => {
    const { chunks } = inputData;
    const indexes = await vectorStore.listIndexes();
    if (!indexes.includes(config.indexName)) {
      await vectorStore.createIndex({
        indexName: config.indexName,
        dimension: config.embeddingDimension,
        metric: "cosine",
      });
    }
    const vectors = await embed(chunks.map((c) => c.text));
    // Chunk ids as vector ids make a re-run overwrite instead of duplicating.
    await vectorStore.upsert({
      indexName: config.indexName,
      vectors,
      ids: chunks.map((c) => c.id),
      metadata: chunks.map((c) => ({ chunkId: c.id, article: c.article, text: c.text })),
    });
    return { indexed: chunks.length, indexName: config.indexName };
  },
});

export const ingestCorpusWorkflow = createWorkflow({
  id: "ingest-corpus",
  description: "Baut den Vektorindex aus dem wörtlichen EU-AI-Act-Korpus",
  inputSchema: z.object({ path: z.string().default("corpus/chunks.json") }),
  outputSchema: z.object({ indexed: z.number(), indexName: z.string() }),
})
  .then(loadChunks)
  .then(embedAndUpsert)
  .commit();
