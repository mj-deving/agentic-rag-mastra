import { mastra } from "../src/mastra";

// Runs the ingest workflow through the Mastra instance, so the run is traced like any other.
const run = await mastra.getWorkflow("ingestCorpusWorkflow").createRun();
const result = await run.start({ inputData: { path: "corpus/chunks.json" } });
if (result.status !== "success") {
  console.error(`ingest ${result.status}`, "error" in result ? result.error : "");
  process.exit(1);
}
console.log(`indexed ${result.result.indexed} chunks into ${result.result.indexName}`);
