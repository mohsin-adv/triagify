import { cosineSimilarity } from "compute-cosine-similarity";
import fs from "fs";

export async function buildIssueVectorDB(issues) {
    const db = [];
    for (const issue of issues) {
        const text = `${issue.summary}\n${issue.description}\n${issue.comments}`;
        const embedding = await createEmbedding(text);
        db.push({ key: issue.key, text, embedding, resolution: issue.resolution });
    }
    fs.writeFileSync("issue_vectors.json", JSON.stringify(db, null, 2));
}

export async function findSimilarIssues(queryText) {
    const db = JSON.parse(fs.readFileSync("issue_vectors.json"));
    const queryEmbedding = await createEmbedding(queryText);

    const scored = db.map(issue => ({
        ...issue,
        similarity: cosineSimilarity(queryEmbedding, issue.embedding),
    }));

    return scored.sort((a, b) => b.similarity - a.similarity).slice(0, 3); // top 3
}