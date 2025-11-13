import { getCohereEmbedding } from "./services/embeddings.js";
import { getResolutionSuggestion } from "./services/claude.js";

async function main() {
  const issue = {
    summary: "Service fails to start after new deployment",
    description: "After patch upgrade, backend service crashes on startup.",
  };

  const similarIssues = [
    { summary: "Crash after patch", resolution: "Rebuilt Docker image" },
    { summary: "Startup error after dependency change", resolution: "Upgraded library version" },
  ];

  const embedding = await getCohereEmbedding(`${issue.summary}\n${issue.description}`);
  console.log("📈 Embedding received successfully");

  const suggestion = await getResolutionSuggestion(issue, similarIssues);
  console.log("✅ Final Suggestion:", suggestion);
}

main();