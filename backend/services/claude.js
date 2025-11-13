import Anthropic from "@anthropic-ai/sdk";
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function suggestResolution(queryIssue, similarIssues) {
    const formattedIssues = similarIssues.map(
        i => `Issue: ${i.key}\nSummary: ${i.text}\nResolution: ${i.resolution}\n`
    ).join("\n---\n");

    const prompt = `
You are a software triage assistant.
A new issue has been reported:

"${queryIssue}"

Here are some similar historical issues and how they were resolved:
${formattedIssues}

Based on this information, summarize the most likely root cause and a recommended next step.
`;

    const response = await claude.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
    });

    return response.content[0].text;
}