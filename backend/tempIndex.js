import { getCohereEmbedding } from "./services/embeddings.js";
import { getResolutionSuggestion } from "./services/claude.js";
import { buildIssueVectorDB, findSimilarIssues } from "./services/vector.js";
import fs from "fs";

async function main() {
    const issue = {
        summary: "Service fails to start after new deployment",
        description: "After patch upgrade, backend service crashes on startup.",
    };

    const similarIssues = [
        { summary: "Crash after patch", resolution: "Rebuilt Docker image" },
        { summary: "Startup error after dependency change", resolution: "Upgraded library version" },
    ];

    //const data = fs.readFileSync("./result.json", "utf-8");
    //const issues = JSON.parse(data);
    //await buildIssueVectorDB(issues.issues);

    // Step 2: Query for similar issues
    const query = "Emails in smartmail without attachment are going in processed folder instead of invalid";
    const similar = await findSimilarIssues(query);
    console.log(similar);
    const suggestion = await getResolutionSuggestion(query, similar);
    console.log("✅ Final Suggestion:", suggestion);

    //   const embedding = await getCohereEmbedding(`${issue.summary}\n${issue.description}`);
    //   console.log("📈 Embedding received successfully");

    //   const suggestion = await getResolutionSuggestion(issue, similarIssues);
    //   console.log("✅ Final Suggestion:", suggestion);
}

main();