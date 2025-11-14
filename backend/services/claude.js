import bedrockClient from "./bedrockClient.js";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function getResolutionSuggestion(issue, similarIssues) {
    const prompt = `
You are an AI JIRA assistant. A user reported this issue:

"${issue.query}"

Here are similar issues and their resolutions:
${similarIssues.map((i, idx) => `[${idx + 1}] ${i.summary} → Resolution: ${i.text}`).join("\n")}

Suggest likely root cause and next steps.
`;

    const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            anthropic_version: "bedrock-2023-05-31",
        }),
    });

    try {
        const response = await bedrockClient.send(command);
        const raw = new TextDecoder().decode(response.body);
        const result = JSON.parse(raw);
        const message = result.content?.[0]?.text || "(No response text found)";
        console.log("🧠 Claude Suggestion:\n", message);
        return message;
    } catch (err) {
        console.error("❌ Error calling Claude via Bedrock:", err);
    }
}

