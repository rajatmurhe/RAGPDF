function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  const cleanText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleanText) {
    return [];
  }

  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0");
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error(
      "overlap must be >= 0 and smaller than chunkSize"
    );
  }

  const chunks = [];
  let start = 0;

  while (start < cleanText.length) {
    let end = Math.min(start + chunkSize, cleanText.length);

    if (end < cleanText.length) {
      const paragraphBreak = cleanText.lastIndexOf("\n\n", end);
      const lineBreak = cleanText.lastIndexOf("\n", end);
      const sentenceBreak = Math.max(
        cleanText.lastIndexOf(". ", end),
        cleanText.lastIndexOf("? ", end),
        cleanText.lastIndexOf("! ", end)
      );

      if (paragraphBreak > start + chunkSize * 0.5) {
        end = paragraphBreak;
      } else if (lineBreak > start + chunkSize * 0.6) {
        end = lineBreak;
      } else if (sentenceBreak > start + chunkSize * 0.6) {
        end = sentenceBreak + 1;
      }
    }

    const chunk = cleanText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= cleanText.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

module.exports = {
  splitTextIntoChunks,
};