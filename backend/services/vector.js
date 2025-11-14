import { getCohereEmbedding } from "./embeddings.js";
import fs from "fs";
// import pkg from "compute-cosine-similarity";
// const { cosineSimilarity } = pkg;
import cosineSimilarity from "compute-cosine-similarity";

export async function buildIssueVectorDB(issues) {
    const db = [];
    for (const issue of issues) {
        const text = `${issue.summary ?? ""}\n${issue.description?.content?.[0]?.content?.[0]?.text ?? ""}\n${issue.comments ?? ""}`;
        const embedding = await getCohereEmbedding(text);
        db.push({ key: issue.key, summary, text, embedding, status: issue.status });
    }
    fs.writeFileSync("issue_vectors.json", JSON.stringify(db, null, 2));
}

export async function findSimilarIssues(queryText) {
    const db = JSON.parse(fs.readFileSync("issue_vectors.json"));
    const queryEmbedding = await getCohereEmbedding(queryText);

    const scored = db.map(issue => ({
        ...issue,
        similarity: cosineSimilarity(queryEmbedding, issue.embedding),
    }));

    return scored.sort((a, b) => b.similarity - a.similarity).slice(0, 4); // top 4
}