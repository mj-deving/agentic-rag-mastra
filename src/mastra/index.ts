import { Mastra } from "@mastra/core/mastra";
import { LangfuseExporter } from "@mastra/langfuse";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { MastraStorageExporter, Observability } from "@mastra/observability";
import { config } from "../lib/config";
import { regulationAgent } from "./agents/regulation-agent";
import { vectorStore } from "./lib/vector-store";
import { citationRecallScorer, citationValidityScorer, factCoverageScorer, refusalScorer } from "./scorers";
import { ingestCorpusWorkflow } from "./workflows/ingest-corpus";

// Traces always go to local storage, which Mastra Studio reads. Langfuse is added only when its
// keys are present, so the default path needs no account and no network.
const langfuse =
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
    ? [new LangfuseExporter({ baseUrl: process.env.LANGFUSE_BASE_URL })]
    : [];

export const mastra = new Mastra({
  agents: { regulationAgent },
  workflows: { ingestCorpusWorkflow },
  vectors: { vectorStore },
  scorers: { citationValidityScorer, refusalScorer, citationRecallScorer, factCoverageScorer },
  storage: new LibSQLStore({ id: "mastra-storage", url: config.dbUrl }),
  logger: new PinoLogger({ name: "agentic-rag-mastra", level: "error" }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "agentic-rag-mastra",
        exporters: [new MastraStorageExporter(), ...langfuse],
      },
    },
  }),
});
