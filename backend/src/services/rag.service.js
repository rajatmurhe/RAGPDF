const { generateEmbedding } = require("./embedding.service");

const {
  searchSimilarChunks,
  searchKeywordChunks,
  getRepresentativeChunks,
  reciprocalRankFusion,
} = require("./search.service");

const {
  generateAnswer,
  resolveStandaloneQuery,
} = require("./llm.service");

const pool = require("../db/postgres");

/* ============================================================
   CONFIGURATION
============================================================ */

const MAX_CONTEXT_CHARS = 24000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_CONTEXT_ROWS = 18;
const MAX_FALLBACK_SENTENCES = 6;
const RRF_K = 60;

/*
 * Optional Gemini-based standalone query resolver.
 *
 * Keep false while using the Gemini free-tier quota.
 */
const ENABLE_QUERY_RESOLVER =
  process.env.ENABLE_QUERY_RESOLVER === "true";

/* ============================================================
   GENERIC STOP WORDS
============================================================ */

const STOP_WORDS = new Set([
  "what",
  "where",
  "when",
  "which",
  "who",
  "whom",
  "whose",
  "does",
  "do",
  "did",
  "is",
  "are",
  "was",
  "were",
  "this",
  "that",
  "these",
  "those",
  "there",
  "have",
  "has",
  "had",
  "with",
  "from",
  "about",
  "into",
  "onto",
  "your",
  "you",
  "the",
  "and",
  "for",
  "how",
  "why",
  "can",
  "could",
  "would",
  "should",
  "will",
  "me",
  "my",
  "please",
  "document",
  "doc",
  "pdf",
  "tell",
  "give",
  "show",
  "some",
  "more",
  "than",
  "then",
  "them",
  "they",
  "their",
  "it",
]);

/* ============================================================
   TEXT HELPERS
============================================================ */

function cleanText(text) {
  return String(text || "")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestion(question) {
  return cleanText(question)
    .replace(/\bwaht\b/gi, "what")
    .replace(/\bdocumnt\b/gi, "document")
    .replace(/\btasl\b/gi, "task")
    .replace(/\btaks\b/gi, "task");
}

function normalizeHistory(history) {
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
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: item.content
        .trim()
        .slice(0, 4000),
    }));
}

function questionTerms(question) {
  return [
    ...new Set(
      normalizeQuestion(question)
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(
          (term) =>
            term.length >= 3 &&
            !STOP_WORDS.has(term)
        )
    ),
  ].slice(0, 18);
}

/* ============================================================
   QUESTION INTENT
============================================================ */

function isOverviewQuestion(question) {
  const q =
    normalizeQuestion(question).toLowerCase();

  return (
    /\bwhat(?:'s| is)\b.*\b(document|doc|pdf)\b.*\babout\b/.test(
      q
    ) ||
    /\bwhat\b.*\b(document|doc|pdf)\b.*\b(contain|cover|discuss)\b/.test(
      q
    ) ||
    (
      /\bwhat(?:'s| is)\b.*\b(document|doc|pdf)\b/.test(
        q
      ) &&
      /\b(this|the)\b/.test(q)
    ) ||
    /\b(summary|summarize|overview)\b/.test(
      q
    ) ||
    /\btell me about\b.*\b(document|doc|pdf)\b/.test(
      q
    )
  );
}

function isFollowUpQuestion(question) {
  const q =
    normalizeQuestion(question)
      .toLowerCase()
      .trim();

  return (
    q.length <= 160 &&
    (
      /^(elaborate|explain|expand|continue|go deeper|tell me more)\b/.test(
        q
      ) ||
      /^(what about|how about|how does that|how is that|what does that)\b/.test(
        q
      ) ||
      /\b(that|this|it|they|them|those|the same)\b/.test(
        q
      )
    )
  );
}

function isCollectionQuestion(question) {
  const q =
    normalizeQuestion(question)
      .toLowerCase()
      .trim();

  return (
    /\b(elaborate|expand|explain|describe|discuss)\b/.test(
      q
    ) ||
    /\b(list|show)\b/.test(q) ||
    /\bwhat are\b/.test(q) ||
    /\bwhat were\b/.test(q) ||
    /\bmain\b.*\b(items|points|parts|sections|topics)\b/.test(
      q
    )
  );
}

function isObjectiveQuestion(question) {
  const q =
    normalizeQuestion(question)
      .toLowerCase();

  return (
    /\bwhat\s+(is|was)\s+(the\s+)?(task|objective|aim|purpose|goal)\b/.test(
      q
    ) ||
    /\bwhat\s+does\s+this\b.*\b(do|aim|try)\b/.test(
      q
    ) ||
    /\bwhat\s+are\s+we\b.*\b(supposed|doing)\b/.test(
      q
    )
  );
}

/*
 * Important distinction:
 *
 * Overview questions are complete questions and should NEVER
 * inherit previous conversation text for retrieval.
 *
 * Other short/ambiguous questions may need prior context.
 */
function needsPriorContext(question) {
  if (isOverviewQuestion(question)) {
    return false;
  }

  return (
    isFollowUpQuestion(question) ||
    questionTerms(question).length <= 2
  );
}

/* ============================================================
   LOCAL FOLLOW-UP QUERY REWRITE
============================================================ */

/*
 * For a contextual follow-up, use the previous user question
 * as the main topic anchor and the previous assistant answer
 * only as a small supplement.
 *
 * A previous answer that is clearly just a raw PDF dump is not
 * useful retrieval context, so it is excluded structurally.
 */
function buildRetrievalQuestion(
  question,
  history
) {
  const cleanQuestion =
    normalizeQuestion(question);

  if (
    !needsPriorContext(cleanQuestion)
  ) {
    return cleanQuestion;
  }

  if (
    !Array.isArray(history) ||
    history.length === 0
  ) {
    return cleanQuestion;
  }

  const reversed =
    [...history].reverse();

  const lastUser =
    reversed.find(
      (item) =>
        item?.role === "user" &&
        typeof item.content === "string" &&
        item.content.trim()
    );

  const lastAssistant =
    reversed.find(
      (item) =>
        item?.role === "assistant" &&
        typeof item.content === "string" &&
        item.content.trim()
    );

  const userContext =
    lastUser
      ? lastUser.content
          .trim()
          .slice(0, 220)
      : "";

  const assistantRaw =
    lastAssistant
      ? lastAssistant.content.trim()
      : "";

  /*
   * Only suppress obviously raw/low-value answer dumps.
   * This is structural protection, not document-specific logic.
   */
  const looksLikeRawDump =
    assistantRaw.length > 900 ||
    (
      assistantRaw.length > 500 &&
      (
        assistantRaw.split(/\s+/).length >
          100 ||
        /Dear Hiring Manager/i.test(
          assistantRaw
        )
      )
    );

  const assistantContext =
    !looksLikeRawDump &&
    assistantRaw
      ? assistantRaw.slice(0, 500)
      : "";

  const parts = [
    cleanQuestion,
  ];

  if (userContext) {
    parts.push(
      `Previous question: ${userContext}`
    );
  }

  if (assistantContext) {
    parts.push(
      `Previous answer: ${assistantContext}`
    );
  }

  return parts.join(
    " — "
  );
}

/* ============================================================
   DATABASE HELPERS
============================================================ */

async function getDocumentChunks(
  filename
) {
  const result =
    await pool.query(
      `
        SELECT
          id,
          filename,
          page_number,
          chunk_index,
          content,
          metadata
        FROM documents
        WHERE filename = $1
        ORDER BY
          chunk_index ASC NULLS LAST,
          page_number ASC NULLS LAST;
      `,
      [filename]
    );

  return result.rows;
}

function uniqueById(rows) {
  const seen = new Set();

  return rows.filter((row) => {
    const id =
      row?.id ||
      `${row?.filename || ""}:${
        row?.chunk_index ?? ""
      }:${row?.page_number ?? ""}`;

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);

    return true;
  });
}

function sortForContext(rows) {
  return [...rows].sort(
    (a, b) => {
      const aChunk =
        Number.isFinite(
          Number(a?.chunk_index)
        )
          ? Number(a.chunk_index)
          : Number.MAX_SAFE_INTEGER;

      const bChunk =
        Number.isFinite(
          Number(b?.chunk_index)
        )
          ? Number(b.chunk_index)
          : Number.MAX_SAFE_INTEGER;

      if (
        aChunk !== bChunk
      ) {
        return (
          aChunk -
          bChunk
        );
      }

      return (
        (Number(
          a?.page_number
        ) || 0) -
        (Number(
          b?.page_number
        ) || 0)
      );
    }
  );
}

/* ============================================================
   CONTEXT CONSTRUCTION
============================================================ */

function buildContext(rows) {
  const ordered =
    sortForContext(
      rows
    );

  const sections = [];
  let totalCharacters = 0;

  for (
    const row of ordered
  ) {
    const content =
      cleanText(
        row?.content
      );

    if (!content) {
      continue;
    }

    const chunkIndex =
      row?.metadata
        ?.chunkIndex ??
      row?.metadata
        ?.chunk_index ??
      row?.chunk_index ??
      0;

    const pageNumber =
      row?.page_number ??
      row?.metadata
        ?.pageNumber ??
      null;

    const label =
      pageNumber
        ? `[Document page ${pageNumber}, chunk ${chunkIndex}]`
        : `[Document chunk ${chunkIndex}]`;

    const section =
      `${label}\n${content}`;

    if (
      totalCharacters +
        section.length >
      MAX_CONTEXT_CHARS
    ) {
      break;
    }

    sections.push(
      section
    );

    totalCharacters +=
      section.length;
  }

  return sections.join(
    "\n\n"
  );
}

/* ============================================================
   FALLBACK HELPERS
============================================================ */

function splitSentences(text) {
  return cleanText(text)
    .split(
      /(?<=[.!?])\s+/
    )
    .map((sentence) =>
      sentence.trim()
    )
    .filter(Boolean);
}

function isUsableSentence(
  sentence
) {
  const s =
    String(sentence || "")
      .trim();

  if (s.length < 25) {
    return false;
  }

  if (s.length > 400) {
    return false;
  }

  const words =
    s.split(/\s+/);

  if (words.length < 5) {
    return false;
  }

  const alphaWords =
    words.filter((word) =>
      /[a-z]/i.test(word)
    );

  const upperWords =
    alphaWords.filter(
      (word) =>
        word === word.toUpperCase() &&
        word.length > 1
    );

  if (
    alphaWords.length &&
    upperWords.length /
        alphaWords.length >
      0.5
  ) {
    return false;
  }

  const digitRatio =
    (s.match(/\d/g) || [])
      .length /
    Math.max(
      s.length,
      1
    );

  if (digitRatio > 0.3) {
    return false;
  }

  return true;
}

function uniqueSentences(
  sentences
) {
  const seen = new Set();
  const result = [];

  for (
    const sentence of sentences
  ) {
    const cleaned =
      cleanText(
        sentence
      );

    const key =
      cleaned.toLowerCase();

    if (
      !cleaned ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(
      cleaned
    );
  }

  return result;
}

function sentenceScore(
  sentence,
  terms
) {
  const lower =
    sentence.toLowerCase();

  let score = 0;

  for (
    const term of terms
  ) {
    if (
      lower.includes(term)
    ) {
      score += 1;
    }
  }

  return score;
}

function deterministicOverview(
  rows
) {
  const sentences = [];

  for (
    const row of sortForContext(
      rows
    )
  ) {
    sentences.push(
      ...splitSentences(
        row?.content
      ).filter(
        isUsableSentence
      )
    );

    if (
      sentences.length >=
      12
    ) {
      break;
    }
  }

  const unique =
    uniqueSentences(
      sentences
    );

  if (!unique.length) {
    return (
      "I couldn't find that information in this document."
    );
  }

  return unique
    .slice(0, 6)
    .join(" ");
}

function deterministicRelevant(
  question,
  rows
) {
  const terms =
    questionTerms(
      question
    );

  const candidates = [];

  for (
    const row of sortForContext(
      rows
    )
  ) {
    const sentences =
      splitSentences(
        row?.content
      ).filter(
        isUsableSentence
      );

    for (
      const sentence of sentences
    ) {
      const score =
        sentenceScore(
          sentence,
          terms
        );

      if (score > 0) {
        candidates.push({
          sentence,
          score,
          chunkIndex:
            Number(
              row?.chunk_index
            ) || 0,
        });
      }
    }
  }

  if (!candidates.length) {
    return (
      "I couldn't find that information in this document."
    );
  }

  candidates.sort(
    (a, b) => {
      if (
        b.score !==
        a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      return (
        a.chunkIndex -
        b.chunkIndex
      );
    }
  );

  const selected =
    uniqueSentences(
      candidates
        .slice(
          0,
          MAX_FALLBACK_SENTENCES
        )
        .map(
          (item) =>
            item.sentence
        )
    );

  if (!selected.length) {
    return (
      "I couldn't find that information in this document."
    );
  }

  return selected.join(
    " "
  );
}

function deterministicCollection(
  question,
  rows
) {
  const terms =
    questionTerms(
      question
    );

  const candidates = [];

  for (
    const row of sortForContext(
      rows
    )
  ) {
    const sentences =
      splitSentences(
        row?.content
      ).filter(
        isUsableSentence
      );

    for (
      const sentence of sentences
    ) {
      const score =
        sentenceScore(
          sentence,
          terms
        );

      if (score > 0) {
        candidates.push({
          sentence,
          score,
          chunkIndex:
            Number(
              row?.chunk_index
            ) || 0,
        });
      }
    }
  }

  if (!candidates.length) {
    return deterministicOverview(
      rows.slice(0, 8)
    );
  }

  candidates.sort(
    (a, b) => {
      if (
        b.score !==
        a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      return (
        a.chunkIndex -
        b.chunkIndex
      );
    }
  );

  const selected =
    uniqueSentences(
      candidates
        .slice(0, 8)
        .map(
          (item) =>
            item.sentence
        )
    );

  return selected.length
    ? selected
        .slice(0, 6)
        .join(" ")
    : (
        "I couldn't find that information in this document."
      );
}

/* ============================================================
   MAIN RAG PIPELINE
============================================================ */

async function answerQuestion(
  question,
  limit = 6,
  filename,
  history = []
) {
  const cleanQuestion =
    normalizeQuestion(
      question
    );

  const cleanFilename =
    String(
      filename || ""
    ).trim();

  if (!cleanQuestion) {
    throw new Error(
      "Question is required."
    );
  }

  if (!cleanFilename) {
    throw new Error(
      "A document is required for every chat query."
    );
  }

  const safeHistory =
    normalizeHistory(
      history
    );

  const overview =
    isOverviewQuestion(
      cleanQuestion
    );

  const followUp =
    isFollowUpQuestion(
      cleanQuestion
    );

  const collection =
    isCollectionQuestion(
      cleanQuestion
    );

  const objective =
    isObjectiveQuestion(
      cleanQuestion
    );

  const contextNeeded =
    needsPriorContext(
      cleanQuestion
    );

  /* ==========================================================
     RETRIEVAL QUERY
  ========================================================== */

  let retrievalQuestion = "";

  /*
   * Optional Gemini resolver.
   *
   * Keep disabled while on the free-tier quota.
   */
  if (
    ENABLE_QUERY_RESOLVER &&
    contextNeeded
  ) {
    try {
      retrievalQuestion =
        await resolveStandaloneQuery(
          cleanQuestion,
          safeHistory
        );
    } catch (error) {
      console.warn(
        "Standalone query resolution failed, using local rewrite:",
        error.message
      );
    }
  }

  /*
   * Normal retrieval-query construction.
   */
  if (
    !retrievalQuestion ||
    !retrievalQuestion.trim()
  ) {
    retrievalQuestion =
      buildRetrievalQuestion(
        cleanQuestion,
        safeHistory
      );
  }

  retrievalQuestion =
    normalizeQuestion(
      retrievalQuestion
    );

  console.log(
    "RAG intent:",
    {
      overview,
      followUp,
      collection,
      objective,
      contextNeeded,
    }
  );

  console.log(
    "RAG retrieval query:",
    retrievalQuestion
  );

  let results = [];

  /* ==========================================================
     OVERVIEW RETRIEVAL
  ========================================================== */

  if (overview) {
    const allChunks =
      await getDocumentChunks(
        cleanFilename
      );

    if (!allChunks.length) {
      return {
        answer:
          "I couldn't find that information in this document.",
        sources: [],
      };
    }

    let representative = [];

    try {
      representative =
        await getRepresentativeChunks(
          cleanFilename,
          12
        );
    } catch (error) {
      console.warn(
        "Representative retrieval failed:",
        error.message
      );
    }

    results =
      uniqueById([
        ...representative,
        ...allChunks.slice(
          0,
          6
        ),
        ...allChunks.slice(
          -6
        ),
      ]);
  }

  /* ==========================================================
     NORMAL / FOLLOW-UP / COLLECTION RETRIEVAL
  ========================================================== */

  else {
    let semanticResults = [];

    try {
      const embedding =
        await generateEmbedding(
          retrievalQuestion
        );

      semanticResults =
        await searchSimilarChunks(
          embedding,

          collection ||
            contextNeeded
            ? 14
            : Math.max(
                Number(limit) ||
                  6,
                8
              ),

          cleanFilename
        );
    } catch (error) {
      console.warn(
        "Semantic retrieval failed:",
        error.message
      );
    }

    const terms =
      questionTerms(
        retrievalQuestion
      );

    let lexicalResults = [];

    if (
      terms.length
    ) {
      try {
        lexicalResults =
          await searchKeywordChunks(
            cleanFilename,
            terms,

            collection ||
              contextNeeded
              ? 14
              : 10
          );
      } catch (error) {
        console.warn(
          "Lexical retrieval failed:",
          error.message
        );
      }
    }

    let representative = [];

    /*
     * Representative chunks are another ranked list.
     * They are not blindly placed first.
     */
    if (
      collection ||
      contextNeeded ||
      objective
    ) {
      try {
        representative =
          await getRepresentativeChunks(
            cleanFilename,
            6
          );
      } catch (error) {
        console.warn(
          "Representative retrieval failed:",
          error.message
        );
      }
    }

    results =
      reciprocalRankFusion(
        [
          lexicalResults,
          semanticResults,
          representative,
        ],
        RRF_K
      );
  }

  /* ==========================================================
     ABSOLUTE DOCUMENT ISOLATION
  ========================================================== */

  results =
    results.filter(
      (row) =>
        row &&
        row.filename ===
          cleanFilename
    );

  results =
    uniqueById(
      results
    );

  /* ==========================================================
     RETRIEVAL OBSERVABILITY
  ========================================================== */

  if (
    results.length < 3
  ) {
    console.warn(
      "Low-confidence retrieval: fewer than 3 usable chunks.",
      {
        question:
          cleanQuestion,

        retrievalQuestion,

        filename:
          cleanFilename,

        resultCount:
          results.length,
      }
    );
  }

  if (
    results.length > 0 &&
    !overview
  ) {
    const strongestScore =
      Math.max(
        ...results.map(
          (row) =>
            Number(
              row.fusedScore
            ) ||
            Number(
              row.relevanceScore
            ) ||
            Number(
              row.similarity
            ) ||
            0
        )
      );

    if (
      strongestScore <
      0.02
    ) {
      console.warn(
        "Low-confidence retrieval: weak fused ranking.",
        {
          question:
            cleanQuestion,

          retrievalQuestion,

          filename:
            cleanFilename,

          strongestScore,
        }
      );
    }
  }

  if (!results.length) {
    return {
      answer:
        "I couldn't find that information in this document.",
      sources: [],
    };
  }

  /* ==========================================================
     CONTEXT
  ========================================================== */

  const contextRows =
    overview
      ? sortForContext(
          results
        ).slice(
          0,
          MAX_CONTEXT_ROWS
        )
      : results.slice(
          0,
          MAX_CONTEXT_ROWS
        );

  const context =
    buildContext(
      contextRows
    );

  if (!context.trim()) {
    return {
      answer:
        "I couldn't find that information in this document.",
      sources: [],
    };
  }

  /* ==========================================================
     FALLBACK
  ========================================================== */

  let fallbackAnswer;

  if (overview) {
    fallbackAnswer =
      deterministicOverview(
        contextRows
      );
  } else if (
    collection ||
    followUp
  ) {
    fallbackAnswer =
      deterministicCollection(
        cleanQuestion,
        contextRows
      );
  } else {
    fallbackAnswer =
      deterministicRelevant(
        cleanQuestion,
        contextRows
      );
  }

  /* ==========================================================
     GEMINI FINAL ANSWER
  ========================================================== */

  let answer = "";

  try {
    answer =
      await generateAnswer(
        cleanQuestion,
        context,
        {
          mode: overview
            ? "overview"
            : collection ||
                followUp
              ? "detailed"
              : "qa",

          history:
            safeHistory,

          documentName:
            cleanFilename,
        }
      );
  } catch (error) {
    console.warn(
      "LLM generation unavailable:",
      error.message
    );
  }

  /*
   * Never dump raw chunks directly.
   */
  if (
    !answer ||
    !answer.trim()
  ) {
    answer =
      fallbackAnswer;
  }

  /* ==========================================================
     SOURCES
  ========================================================== */

  const sources =
    contextRows.map(
      (result) => ({
        filename:
          result.filename,

        chunkIndex:
          result?.metadata
            ?.chunkIndex ??
          result?.metadata
            ?.chunk_index ??
          result?.chunk_index ??
          0,

        similarity:
          Number(
            result.similarity
          ) || 0,

        relevanceScore:
          Number(
            result.fusedScore
          ) ||
          Number(
            result.relevanceScore
          ) ||
          Number(
            result.similarity
          ) ||
          0,
      })
    );

  return {
    answer,
    sources,
  };
}

/* ============================================================
   RETRIEVE CONTEXT API
============================================================ */

async function retrieveContext(
  question,
  limit = 6,
  filename
) {
  const cleanFilename =
    String(
      filename || ""
    ).trim();

  if (!cleanFilename) {
    throw new Error(
      "A document is required for retrieval."
    );
  }

  const embedding =
    await generateEmbedding(
      question
    );

  return searchSimilarChunks(
    embedding,
    limit,
    cleanFilename
  );
}

module.exports = {
  retrieveContext,
  answerQuestion,
};