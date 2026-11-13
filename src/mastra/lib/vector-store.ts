import { LibSQLVector } from "@mastra/libsql";
import { config } from "../../lib/config";

export const vectorStore = new LibSQLVector({
  id: "eu-ai-act-vectors",
  url: config.dbUrl,
});
