const pool = require("../db/postgres");

function formatVector(embedding) {
  if (!Array.isArray(embedding) || embedding.length !== 384) {
    throw new Error(
      `Invalid embedding: expected 384 dimensions, got ${
        Array.isArray(embedding) ? embedding.length : "unknown"
      }`
    );
  }

  return `[${embedding.join(",")}]`;
}

async function storeDocumentChunk({
  id,
  filename,
  content,
  metadata = {},
  embedding,
}) {
  if (!id) {
    throw new Error("Document chunk id is required");
  }

  if (!filename) {
    throw new Error("Filename is required");
  }

  if (!content || !String(content).trim()) {
    throw new Error("Chunk content is required");
  }

  const vector = formatVector(embedding);

  const chunkIndex =
    Number.isInteger(metadata.chunkIndex)
      ? metadata.chunkIndex
      : null;

  const query = `
    INSERT INTO documents (
      id,
      filename,
      page_number,
      chunk_index,
      content,
      embedding,
      metadata
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6::vector,
      $7::jsonb
    )
    RETURNING id;
  `;

  const values = [
    id,
    filename,
    metadata.pageNumber ?? null,
    chunkIndex,
    String(content).trim(),
    vector,
    JSON.stringify(metadata),
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

module.exports = {
  storeDocumentChunk,
};