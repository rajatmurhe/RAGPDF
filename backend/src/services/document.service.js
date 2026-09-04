const fs = require("fs");
const pdfParse = require("pdf-parse");

/**
 * Extract text and page count from a PDF file.
 *
 * @param {string} filePath
 * @returns {Promise<{text: string, pages: number}>}
 */
async function extractTextFromPDF(filePath) {
  if (!filePath) {
    throw new Error("PDF file path is required");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);

  if (!buffer || buffer.length === 0) {
    throw new Error("PDF file is empty");
  }

  const data = await pdfParse(buffer);

  const text = String(data.text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    throw new Error(
      "No readable text could be extracted from this PDF."
    );
  }

  return {
    text,
    pages: Number(data.numpages) || 0,
  };
}

module.exports = {
  extractTextFromPDF,
};