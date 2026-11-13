import { Agent } from "@mastra/core/agent";
import { config } from "../../lib/config";
import { chatModel } from "../../lib/models";
import { CitationGuard } from "../processors/citation-guard";
import { searchRegulationTool } from "../tools/search-regulation";
import { INSTRUCTIONS } from "./instructions";

// Exported so the eval can record what the guard replaced (onViolation).
export const citationGuard = new CitationGuard();

export const regulationAgent = new Agent({
  id: "regulation-agent",
  name: "EU AI Act Agent",
  description: "Beantwortet Fragen zur KI-Verordnung ausschließlich aus abgerufenen Textstellen, mit Zitat.",
  instructions: INSTRUCTIONS[config.promptVersion],
  model: chatModel,
  tools: { searchRegulationTool },
  outputProcessors: config.guard === "on" ? [citationGuard] : [],
  defaultOptions: {
    providerOptions: { ollama: { think: false } },
    modelSettings: { temperature: 0 },
  },
});
