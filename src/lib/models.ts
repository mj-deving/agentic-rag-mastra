import type { MastraModelConfig } from "@mastra/core/llm";
import { createOllama } from "ollama-ai-provider-v2";
import { config } from "./config";

const ollama = createOllama({ baseURL: config.ollamaBaseUrl });

// The provider ships its own copy of the AI SDK provider types, which TypeScript treats as distinct
// from the copy bundled in @mastra/core. The runtime contract is the same (specificationVersion
// "v4"), and the eval run below exercises it end to end.
export const chatModel = ollama(config.chatModel) as unknown as MastraModelConfig;

const embedder = ollama.textEmbeddingModel(config.embeddingModel);

/** Embeds texts with bge-m3 through Ollama. Throws if Ollama is down rather than degrading. */
export async function embed(values: string[]): Promise<number[][]> {
  const { embeddings } = await embedder.doEmbed({ values });
  if (embeddings.length !== values.length) {
    throw new Error(`embedding count mismatch: ${embeddings.length} for ${values.length} texts`);
  }
  for (const vector of embeddings) {
    if (vector.length !== config.embeddingDimension) {
      throw new Error(`expected ${config.embeddingDimension} dimensions, got ${vector.length}`);
    }
  }
  return embeddings;
}
