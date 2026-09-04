const { pipeline } = require("@xenova/transformers");

let embeddingPipeline = null;

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    console.log(`Loading embedding model: ${MODEL_NAME}`);

    embeddingPipeline = await pipeline(
      "feature-extraction",
      MODEL_NAME
    );

    console.log("Embedding model loaded successfully");
  }

  return embeddingPipeline;
}

async function generateEmbedding(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Text is required to generate an embedding");
  }

  const extractor = await getEmbeddingPipeline();

  const output = await extractor(text.trim(), {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data);

  if (embedding.length !== 384) {
    throw new Error(
      `Invalid embedding dimension: expected 384, got ${embedding.length}`
    );
  }

  return embedding;
}

module.exports = {
  generateEmbedding,
};