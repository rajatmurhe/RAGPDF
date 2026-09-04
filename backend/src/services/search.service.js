const pool = require("../db/postgres");

/* ============================================================
   SHARED HELPERS
============================================================ */

function toVectorLiteral(embedding) {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("A valid query embedding is required.");
  }

  return `[${embedding.join(",")}]`;
}

function normalizeLimit(limit, fallback = 8) {
  const numeric = Number(limit);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(numeric), 20);
}

function cleanFilename(filename) {
  return String(filename || "").trim();
}

function normalizeTerms(terms) {
  if (!Array.isArray(terms)) {
    return [];
  }

  return [
    ...new Set(
      terms
        .map((term) =>
          String(term || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9'-]/g, "")
        )
        .filter((term) => term.length >= 2)
    ),
  ].slice(0, 16);
}

/* ============================================================
   SEMANTIC SEARCH
============================================================ */

async function searchSimilarChunks(
  embedding,
  limit = 8,
  filename
) {
  const documentName =
    cleanFilename(filename);

  if (!documentName) {
    throw new Error(
      "A document filename is required for document-scoped search."
    );
  }

  const vector =
    toVectorLiteral(embedding);

  const safeLimit =
    normalizeLimit(limit, 8);

  const query = `
    SELECT
      id,
      filename,
      content,
      metadata,

      COALESCE(
        NULLIF(
          metadata->>'chunkIndex',
          ''
        )::int,
        0
      ) AS chunk_index,

      1 - (
        embedding <=> $1::vector
      ) AS similarity

    FROM documents

    WHERE filename = $2

    ORDER BY
      embedding <=> $1::vector

    LIMIT $3;
  `;

  const result =
    await pool.query(
      query,
      [
        vector,
        documentName,
        safeLimit,
      ]
    );

  return result.rows.map(
    (row) => ({
      ...row,

      similarity:
        Number(
          row.similarity
        ) || 0,

      relevanceScore:
        Number(
          row.similarity
        ) || 0,

      semanticScore:
        Number(
          row.similarity
        ) || 0,

      chunk_index:
        Number(
          row.chunk_index
        ) || 0,
    })
  );
}

/* ============================================================
   KEYWORD SEARCH
============================================================ */

async function searchKeywordChunks(
  filename,
  terms = [],
  limit = 8
) {
  const documentName =
    cleanFilename(filename);

  if (!documentName) {
    throw new Error(
      "A document filename is required for keyword search."
    );
  }

  const normalizedTerms =
    normalizeTerms(terms);

  if (!normalizedTerms.length) {
    return [];
  }

  const safeLimit =
    normalizeLimit(limit, 8);

  /*
   * Score based on:
   *
   * 1. number of distinct matched terms
   * 2. light frequency bonus
   *
   * Everything remains inside the selected filename.
   */
  const query = `
    WITH scored AS (
      SELECT
        d.id,
        d.filename,
        d.content,
        d.metadata,

        COALESCE(
          NULLIF(
            d.metadata->>'chunkIndex',
            ''
          )::int,
          0
        ) AS chunk_index,

        (
          SELECT COUNT(*)
          FROM unnest($2::text[]) AS term
          WHERE LOWER(d.content)
            LIKE '%' || term || '%'
        ) AS matched_terms,

        (
          SELECT COALESCE(
            SUM(
              LEAST(
                4,
                FLOOR(
                  (
                    LENGTH(
                      LOWER(d.content)
                    )
                    -
                    LENGTH(
                      REPLACE(
                        LOWER(d.content),
                        term,
                        ''
                      )
                    )
                  )
                  /
                  GREATEST(
                    LENGTH(term),
                    1
                  )
                )
              )
            ),
            0
          )
          FROM unnest($2::text[]) AS term

          WHERE LOWER(d.content)
            LIKE '%' || term || '%'
        ) AS occurrence_score

      FROM documents d

      WHERE d.filename = $1
    )

    SELECT
      id,
      filename,
      content,
      metadata,
      chunk_index,

      (
        matched_terms * 2.0
        +
        occurrence_score * 0.25
      ) AS lexical_score

    FROM scored

    WHERE matched_terms > 0

    ORDER BY
      lexical_score DESC,
      chunk_index ASC

    LIMIT $3;
  `;

  const result =
    await pool.query(
      query,
      [
        documentName,
        normalizedTerms,
        safeLimit,
      ]
    );

  return result.rows.map(
    (row) => ({
      ...row,

      /*
       * Do not pretend lexical score is vector similarity.
       */
      similarity: 0,

      lexicalScore:
        Number(
          row.lexical_score
        ) || 0,

      relevanceScore:
        Number(
          row.lexical_score
        ) || 0,

      matchedTerms:
        Number(
          row.matched_terms
        ) || 0,

      chunk_index:
        Number(
          row.chunk_index
        ) || 0,
    })
  );
}

/* ============================================================
   REPRESENTATIVE CHUNKS
============================================================ */

async function getRepresentativeChunks(
  filename,
  count = 8
) {
  const documentName =
    cleanFilename(filename);

  if (!documentName) {
    throw new Error(
      "A document filename is required."
    );
  }

  const safeCount = Math.min(
    Math.max(
      Number(count) || 8,
      3
    ),
    16
  );

  const query = `
    WITH ranked AS (
      SELECT
        id,
        filename,
        content,
        metadata,

        COALESCE(
          NULLIF(
            metadata->>'chunkIndex',
            ''
          )::int,
          0
        ) AS chunk_index,

        ROW_NUMBER() OVER (
          ORDER BY
            COALESCE(
              NULLIF(
                metadata->>'chunkIndex',
                ''
              )::int,
              0
            ) ASC,
            id ASC
        ) AS row_num,

        COUNT(*) OVER () AS total_rows

      FROM documents

      WHERE filename = $1
    )

    SELECT
      id,
      filename,
      content,
      metadata,
      chunk_index

    FROM ranked

    WHERE
      row_num <= CEIL(
        $2 / 3.0
      )

      OR

      row_num >
        total_rows -
        CEIL($2 / 3.0)

      OR

      row_num BETWEEN
        GREATEST(
          1,
          FLOOR(
            total_rows / 2.0
          )
        )
        AND
        LEAST(
          total_rows,
          FLOOR(
            total_rows / 2.0
          ) + 1
        )

    ORDER BY
      chunk_index ASC,
      id ASC;
  `;

  const result =
    await pool.query(
      query,
      [
        documentName,
        safeCount,
      ]
    );

  return result.rows.map(
    (row) => ({
      ...row,

      similarity: 0,
      relevanceScore: 0,
      representativeScore: 1,

      chunk_index:
        Number(
          row.chunk_index
        ) || 0,
    })
  );
}

/* ============================================================
   RRF FUSION
============================================================ */

function reciprocalRankFusion(
  resultLists,
  k = 60
) {
  const scoreById =
    new Map();

  const rowById =
    new Map();

  for (const list of resultLists) {
    if (!Array.isArray(list)) {
      continue;
    }

    list.forEach(
      (row, index) => {
        if (!row) {
          return;
        }

        const id =
          row.id ||
          `${row.filename || ""}:${
            row.chunk_index ?? ""
          }:${row.page_number ?? ""}`;

        const rrfScore =
          1 /
          (k + index + 1);

        scoreById.set(
          id,
          (
            scoreById.get(id) ||
            0
          ) + rrfScore
        );

        if (!rowById.has(id)) {
          rowById.set(
            id,
            row
          );
        }
      }
    );
  }

  return [
    ...scoreById.entries(),
  ]
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .map(
      ([id, score]) => ({
        ...rowById.get(id),

        fusedScore:
          score,

        relevanceScore:
          score,
      })
    );
}

/* ============================================================
   GENERIC HYBRID TOPIC SEARCH
============================================================ */

async function searchTopicChunks(
  filename,
  terms = [],
  limit = 12,
  semanticResults = []
) {
  const documentName =
    cleanFilename(filename);

  if (!documentName) {
    throw new Error(
      "A document filename is required for topic search."
    );
  }

  const safeLimit =
    normalizeLimit(
      limit,
      12
    );

  const lexicalResults =
    await searchKeywordChunks(
      documentName,
      terms,
      safeLimit
    );

  const fused =
    reciprocalRankFusion(
      [
        lexicalResults,
        semanticResults,
      ],
      60
    );

  return fused.slice(
    0,
    safeLimit
  );
}

/* ============================================================
   DOCUMENT STATS
============================================================ */

async function getDocumentChunkCount(
  filename
) {
  const documentName =
    cleanFilename(filename);

  if (!documentName) {
    throw new Error(
      "A document filename is required."
    );
  }

  const result =
    await pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM documents
        WHERE filename = $1;
      `,
      [documentName]
    );

  return (
    Number(
      result.rows[0]?.count
    ) || 0
  );
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  searchSimilarChunks,
  searchKeywordChunks,
  searchTopicChunks,
  getRepresentativeChunks,
  reciprocalRankFusion,
  getDocumentChunkCount,
};