import { pipeline } from "@xenova/transformers";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import bedrockClient from "./bedrockClient.js";

// Load sentence embedding model
const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

async function getEmbeddingLocal(text) {
    // Run inference
    const output = await embedder(text, { pooling: "mean", normalize: true });

    // Convert Float32Array → normal JS array
    const embedding = Array.from(output.data);

    console.log("✅ Embedding generated successfully!");
    console.log("🔢 Length:", embedding.length);
    console.log("📊 Sample values:", embedding.slice(0, 10));

    return embedding;
}

// Enable  to test Embedding usage
// (async () => {
//   const text = "Login API failing intermittently due to database timeout.";
//   await getEmbeddingLocal(text);
// })();


export async function getCohereEmbedding(text) {
    const input = {
        modelId: "cohere.embed-v4:0", // ✅ Cohere Embeddings via Bedrock
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            texts: [text],
            input_type: "search_document" // could be "classification" or "clustering"
        })
    };

    try {
        const command = new InvokeModelCommand(input);
        const response = await bedrockClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        const embedding = result.embeddings.float[0];

        console.log("✅ Embedding length:", embedding.length);
        console.log("📊 Sample:", embedding.slice(0, 10));
        return embedding;
    } catch (err) {
        console.error("❌ Error calling Cohere Embed via Bedrock:", err);
    }
}

// Example usage
(async () => {
    const text = "JIRA deployment task failing after upgrade to Node.js 18";
    await getCohereEmbedding(text);
})();