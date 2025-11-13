import { pipeline } from "@xenova/transformers";

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