import { mastra } from "../src/mastra";

// Usage: bun run ask "Welche Geldbuße droht bei Verstößen gegen Artikel 50?"
const question = process.argv.slice(2).join(" ").trim();
if (question === "") {
  console.error('usage: bun run ask "<Frage>"');
  process.exit(2);
}
const response = await mastra.getAgent("regulationAgent").generate(question);
console.log(response.text);
