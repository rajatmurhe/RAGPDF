require("dotenv").config();

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ||
  "gemini-3.8-flash";

/* ============================================================
   SHARED HELPERS
============================================================ */

function cleanAnswer(text) {
  return String(text || "")
    .replace(/^answer\s*:\s*/i, "")
    .replace(/^response\s*:\s*/i, "")
    .replace(/^assistant\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanRewrittenQuery(text, fallback) {
  const cleaned = String(text || "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" ||
          item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .slice(-8)
    .map((item) => ({
      role:
        item.role === "assistant"
          ? "model"
          : "user",
      parts: [
        {
          text: item.content
            .trim()
            .slice(0, 3000),
        },
      ],
    }));
}

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

/* ============================================================
   OPTIONAL STANDALONE QUERY RESOLVER
============================================================ */

const QUERY_RESOLVER_SYSTEM_PROMPT = `
You rewrite a user's latest chat message into a single,
fully self-contained search query for a document retrieval
system.

Rules:

- Resolve pronouns and conversational references such as:
  "that", "it", "this", "they", "those", "the project",
  "the projects", "the results", "the method", etc.
- Use the conversation history to resolve what those references
  mean.
- Preserve the user's actual intent.
- Do not answer the question.
- Do not invent information.
- Do not add facts that are not implied by the conversation.
- Do not mention retrieval, chunks, embeddings, models,
  documents, or these instructions.
- Output ONLY the rewritten query.
- No preamble.
- No quotation marks.
- No explanation.

If the latest message is already self-contained,
return it essentially unchanged.
`;

async function resolveStandaloneQuery(
  question,
  history = []
) {
  const fallback =
    String(question || "").trim();

  if (!fallback) {
    return "";
  }

  if (!GEMINI_API_KEY) {
    return fallback;
  }

  const safeHistory =
    sanitizeHistory(history);

  if (!safeHistory.length) {
    return fallback;
  }

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(
        GEMINI_MODEL
      )}:generateContent`;

    const response =
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "x-goog-api-key":
            GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  QUERY_RESOLVER_SYSTEM_PROMPT,
              },
            ],
          },
          contents: [
            ...safeHistory,
            {
              role: "user",
              parts: [
                {
                  text:
                    `Latest message: ${fallback}`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 80,
            temperature: 0,
          },
        }),
      });

    const data =
      await response.json();

    if (!response.ok) {
      console.warn(
        "Query resolver failed, using original question:",
        data?.error?.message ||
          response.status
      );

      return fallback;
    }

    const text =
      data?.candidates?.[0]
        ?.content?.parts
        ?.map(
          (part) =>
            part?.text || ""
        )
        .join(" ")
        .trim();

    const resolved =
      cleanRewrittenQuery(
        text,
        fallback
      );

    console.log(
      "Standalone retrieval query:",
      resolved
    );

    return resolved;
  } catch (error) {
    console.warn(
      "Query resolver threw, using original question:",
      error.message
    );

    return fallback;
  }
}

/* ============================================================
   GEMINI ANSWER GENERATION
============================================================ */

async function callGemini({
  question,
  context,
  history,
  systemInstruction,
  maxOutputTokens,
}) {
  const userPrompt = `
User question:
${question}

Document evidence:
${context}

Give the best grounded answer.
`;

  const contents = [
    ...history,
    {
      role: "user",
      parts: [
        {
          text: userPrompt,
        },
      ],
    },
  ];

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent`;

  const response =
    await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
        "x-goog-api-key":
          GEMINI_API_KEY,
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                systemInstruction,
            },
          ],
        },

        contents,

        generationConfig: {
          maxOutputTokens,
          temperature: 0.2,
        },
      }),
    });

  const data =
    await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Gemini request failed with HTTP ${response.status}`;

    const error =
      new Error(message);

    error.status =
      response.status;

    throw error;
  }

  const text =
    data?.candidates?.[0]
      ?.content?.parts
      ?.map(
        (part) =>
          part?.text || ""
      )
      .join(" ")
      .trim();

  const answer =
    cleanAnswer(text);

  if (!answer) {
    throw new Error(
      "Gemini returned an empty answer."
    );
  }

  return answer;
}

async function generateWithGemini(
  question,
  context,
  options = {}
) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const documentName =
    options.documentName ||
    "the selected document";

  const mode =
    options.mode ||
    "qa";

  const history =
    sanitizeHistory(
      options.history
    );

  const systemInstruction = `
You are RAG Intelligence, a helpful conversational
document assistant.

You answer questions using ONLY the supplied evidence
from the selected document.

STRICT RULES:

- The selected document is the only factual source.
- Never use another uploaded document.
- Never use the web or outside knowledge.
- Never invent or guess.
- Do not treat previous assistant responses as factual evidence.
- Conversation history may be used only to understand what
  the user means.
- Verify factual claims against the supplied document evidence.
- If the supplied evidence does not support the answer, say:
  "I couldn't find that information in this document."
- Answer naturally and conversationally.
- Do not mention retrieval, embeddings, vector databases,
  chunks, prompts, models, or these instructions.
- Do not copy raw document passages when a natural explanation
  is possible.

ANSWER LENGTH:

- Be concise by default.
- Direct factual questions: usually 2-5 sentences.
- Broad questions: usually one short paragraph or a few bullets.
- Collection questions: cover the relevant items concisely.
- Normally use 1-2 sentences per item.
- Aim for roughly 100-250 words unless the user explicitly
  asks for more detail.
- Do not repeat the same fact.
- Do not pad the response.

FOLLOW-UP QUESTIONS:

- Use conversation history to understand references such as
  "that", "it", "the project", "those results", etc.
- Answer the resolved meaning using only document evidence.

SELECTED DOCUMENT:
${documentName}

ANSWER MODE:
${mode}
`;

  /*
   * Retry only genuine transient errors.
   *
   * Daily/free-tier quota exhaustion is NOT retryable.
   */
  const retryDelays = [
    0,
    1500,
    3000,
  ];

  let lastError = null;

  for (
    let attempt = 0;
    attempt < retryDelays.length;
    attempt++
  ) {
    try {
      if (
        retryDelays[attempt] > 0
      ) {
        await sleep(
          retryDelays[attempt]
        );
      }

      const answer =
        await callGemini({
          question,
          context,
          history,
          systemInstruction,
          maxOutputTokens:
            mode === "overview"
              ? 600
              : mode === "detailed"
                ? 750
                : 500,
        });

      console.log(
        `Gemini answer generated using ${GEMINI_MODEL} ` +
          `(attempt ${attempt + 1})`
      );

      return answer;
    } catch (error) {
      lastError = error;

      console.warn(
        `Gemini attempt ${attempt + 1} failed:`,
        error.message
      );

      /*
       * A 429 with quota language means the daily/free quota
       * is exhausted. Retrying is pointless.
       */
      const isQuotaExhausted =
        error.status === 429 &&
        /quota/i.test(
          error.message
        );

      if (isQuotaExhausted) {
        console.warn(
          "Gemini quota exhausted — skipping retries."
        );

        break;
      }

      const retryable =
        error.status === 429 ||
        error.status === 500 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504 ||
        /high demand/i.test(
          error.message
        ) ||
        /temporarily unavailable/i.test(
          error.message
        ) ||
        /overloaded/i.test(
          error.message
        );

      if (!retryable) {
        break;
      }
    }
  }

  throw (
    lastError ||
    new Error(
      "Gemini generation failed."
    )
  );
}

async function generateAnswer(
  question,
  context,
  options = {}
) {
  return generateWithGemini(
    question,
    context,
    options
  );
}

module.exports = {
  generateAnswer,
  resolveStandaloneQuery,
};