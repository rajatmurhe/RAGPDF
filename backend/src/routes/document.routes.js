const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const {
  extractTextFromPDF
} = require("../services/document.service");

const {
  splitTextIntoChunks
} = require("../services/chunk.service");

const {
  generateEmbedding
} = require("../services/embedding.service");

const {
  storeDocumentChunk
} = require("../services/vector.service");

const pool = require("../db/postgres");

const router = express.Router();

/* ============================================================
   MULTER STORAGE
============================================================ */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    const uniqueName =
      `${Date.now()}-${file.originalname}`;

    cb(null, uniqueName);
  }
});

/* ============================================================
   MULTER CONFIG
============================================================ */

const upload = multer({
  storage: storage,

  fileFilter: function (req, file, cb) {
    const extension =
      path.extname(file.originalname).toLowerCase();

    if (extension !== ".pdf") {
      return cb(
        new Error("Only PDF files are allowed")
      );
    }

    cb(null, true);
  }
});

/* ============================================================
   GET ALL DOCUMENTS
============================================================ */

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT
        filename,
        MAX((metadata->>'pageCount')::int) AS pages,
        COUNT(*) AS chunks,
        MAX(metadata->>'uploadDate') AS upload_date
      FROM documents
      GROUP BY filename
      ORDER BY MAX(metadata->>'uploadDate') DESC NULLS LAST,
               filename ASC;
    `;

    const result = await pool.query(query);

    const documents = result.rows.map((row) => ({
      filename: row.filename,
      pages: Number(row.pages) || 0,
      chunks: Number(row.chunks) || 0,
      uploadDate: row.upload_date || null
    }));

    res.json({
      status: "OK",
      documents
    });

  } catch (error) {
    console.error(
      "Failed to fetch documents:",
      error
    );

    res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
});

/* ============================================================
   RENAME DOCUMENT
============================================================ */

router.put("/:filename", async (req, res) => {
  try {
    const oldFilename =
      req.params.filename;

    let newFilename =
      req.body?.newFilename;

    if (!oldFilename) {
      return res.status(400).json({
        status: "ERROR",
        message: "Current filename is required"
      });
    }

    if (
      !newFilename ||
      typeof newFilename !== "string"
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "New filename is required"
      });
    }

    newFilename =
      newFilename.trim();

    /* --------------------------------------------------------
       Validate filename
    -------------------------------------------------------- */

    if (!newFilename) {
      return res.status(400).json({
        status: "ERROR",
        message: "New filename cannot be empty"
      });
    }

    if (
      !newFilename
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      newFilename += ".pdf";
    }

    /*
      Prevent dangerous path characters.
    */

    const invalidCharacters =
      /[\/\\:*?"<>|]/;

    if (
      invalidCharacters.test(
        newFilename
      )
    ) {
      return res.status(400).json({
        status: "ERROR",
        message:
          "Filename contains invalid characters"
      });
    }

    /* --------------------------------------------------------
       Check old document
    -------------------------------------------------------- */

    const oldCheck =
      await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM documents
        WHERE filename = $1;
        `,
        [oldFilename]
      );

    if (
      oldCheck.rows[0].count === 0
    ) {
      return res.status(404).json({
        status: "ERROR",
        message: "Document not found"
      });
    }

    /* --------------------------------------------------------
       Prevent duplicate filename
    -------------------------------------------------------- */

    if (
      newFilename !== oldFilename
    ) {
      const duplicateCheck =
        await pool.query(
          `
          SELECT COUNT(*)::int AS count
          FROM documents
          WHERE filename = $1;
          `,
          [newFilename]
        );

      if (
        duplicateCheck.rows[0].count > 0
      ) {
        return res.status(409).json({
          status: "ERROR",
          message:
            "A document with this name already exists"
        });
      }
    }

    /* --------------------------------------------------------
       Update all chunks
    -------------------------------------------------------- */

    const updateResult =
      await pool.query(
        `
        UPDATE documents
        SET filename = $1
        WHERE filename = $2
        RETURNING id;
        `,
        [
          newFilename,
          oldFilename
        ]
      );

    /* --------------------------------------------------------
       Rename physical uploaded PDF
    -------------------------------------------------------- */

    try {
      const uploadsDirectory =
        path.join(
          process.cwd(),
          "uploads"
        );

      if (
        fs.existsSync(
          uploadsDirectory
        )
      ) {
        const files =
          fs.readdirSync(
            uploadsDirectory
          );

        const matchingFiles =
          files.filter((file) =>
            file.endsWith(
              `-${oldFilename}`
            )
          );

        for (
          const file of matchingFiles
        ) {
          const oldPath =
            path.join(
              uploadsDirectory,
              file
            );

          const timestamp =
            file.slice(
              0,
              file.length -
                oldFilename.length
            );

          const newPhysicalName =
            `${timestamp}${newFilename}`;

          const newPath =
            path.join(
              uploadsDirectory,
              newPhysicalName
            );

          try {
            fs.renameSync(
              oldPath,
              newPath
            );

            console.log(
              `Renamed physical file: ${file} -> ${newPhysicalName}`
            );
          } catch (renameError) {
            console.error(
              "Physical file rename failed:",
              renameError.message
            );
          }
        }
      }
    } catch (fileError) {
      console.error(
        "Physical file lookup failed:",
        fileError.message
      );
    }

    console.log(
      `Renamed document: ${oldFilename} -> ${newFilename}`
    );

    return res.json({
      status: "OK",
      oldFilename,
      filename: newFilename,
      updatedChunks:
        updateResult.rowCount,
      message:
        "Document renamed successfully"
    });

  } catch (error) {
    console.error(
      "Document rename failed:",
      error
    );

    return res.status(500).json({
      status: "ERROR",
      message:
        error.message ||
        "Failed to rename document"
    });
  }
});

/* ============================================================
   DELETE DOCUMENT
============================================================ */

router.delete("/:filename", async (req, res) => {
  try {
    const filename =
      req.params.filename;

    console.log(
      "Delete request received:",
      filename
    );

    const checkResult =
      await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM documents
        WHERE filename = $1;
        `,
        [filename]
      );

    if (
      checkResult.rows[0].count === 0
    ) {
      return res.status(404).json({
        status: "ERROR",
        message: "Document not found"
      });
    }

    const deleteResult =
      await pool.query(
        `
        DELETE FROM documents
        WHERE filename = $1
        RETURNING id;
        `,
        [filename]
      );

    console.log(
      `Deleted ${deleteResult.rowCount} chunks from ${filename}`
    );

    /* --------------------------------------------------------
       Delete physical PDF
    -------------------------------------------------------- */

    try {
      const uploadsDirectory =
        path.join(
          process.cwd(),
          "uploads"
        );

      if (
        fs.existsSync(
          uploadsDirectory
        )
      ) {
        const files =
          fs.readdirSync(
            uploadsDirectory
          );

        for (
          const file of files
        ) {
          if (
            file.endsWith(
              `-${filename}`
            )
          ) {
            const filePath =
              path.join(
                uploadsDirectory,
                file
              );

            try {
              fs.unlinkSync(
                filePath
              );

              console.log(
                `Deleted physical file: ${file}`
              );
            } catch (fileError) {
              console.error(
                `Could not delete physical file ${file}:`,
                fileError.message
              );
            }
          }
        }
      }
    } catch (fileSystemError) {
      console.error(
        "Physical file cleanup failed:",
        fileSystemError.message
      );
    }

    return res.json({
      status: "OK",
      filename,
      deletedChunks:
        deleteResult.rowCount,
      message:
        "Document deleted successfully"
    });

  } catch (error) {
    console.error(
      "Document deletion failed:",
      error
    );

    return res.status(500).json({
      status: "ERROR",
      message:
        error.message ||
        "Failed to delete document"
    });
  }
});

/* ============================================================
   PDF UPLOAD
============================================================ */

router.post(
  "/upload",
  upload.single("pdf"),
  async (req, res) => {
    console.log(
      "Upload route reached"
    );

    try {
      if (!req.file) {
        return res.status(400).json({
          status: "ERROR",
          message:
            "No PDF file uploaded"
        });
      }

      const filename =
        req.file.originalname;

      /* --------------------------------------------------------
         PREVENT DUPLICATE UPLOAD
      -------------------------------------------------------- */

      const duplicateCheck =
        await pool.query(
          `
          SELECT COUNT(*)::int AS count
          FROM documents
          WHERE filename = $1;
          `,
          [filename]
        );

      if (
        duplicateCheck.rows[0].count > 0
      ) {
        /*
          Delete the newly uploaded duplicate
          from the uploads directory.
        */

        try {
          if (
            req.file.path &&
            fs.existsSync(
              req.file.path
            )
          ) {
            fs.unlinkSync(
              req.file.path
            );
          }
        } catch (cleanupError) {
          console.error(
            "Duplicate file cleanup failed:",
            cleanupError.message
          );
        }

        return res.status(409).json({
          status: "ERROR",
          message:
            "This document is already uploaded.",
          filename
        });
      }

      /* --------------------------------------------------------
         Extract PDF
      -------------------------------------------------------- */

      const pdfResult =
        await extractTextFromPDF(
          req.file.path
        );

      /* --------------------------------------------------------
         Split into chunks
      -------------------------------------------------------- */

      const chunks =
        await splitTextIntoChunks(
          pdfResult.text
        );

      /* --------------------------------------------------------
         Upload timestamp
      -------------------------------------------------------- */

      const uploadDate =
        new Date().toISOString();

      /* --------------------------------------------------------
         Generate and store embeddings
      -------------------------------------------------------- */

      for (
        let i = 0;
        i < chunks.length;
        i++
      ) {
        const chunk =
          chunks[i];

        console.log(
          `Generating embedding ${i + 1}/${chunks.length}`
        );

        const embedding =
          await generateEmbedding(
            chunk
          );

        await storeDocumentChunk({
          id: uuidv4(),

          filename,

          content:
            chunk,

          metadata: {
            pageCount:
              pdfResult.pages,

            chunkIndex:
              i,

            uploadDate
          },

          embedding
        });
      }

      console.log(
        `PDF processed successfully: ${filename}`
      );

      return res.json({
        status: "OK",
        filename,
        pages:
          pdfResult.pages,
        chunks:
          chunks.length,
        uploadDate,
        message:
          "PDF processed and stored successfully"
      });

    } catch (error) {
      console.error(
        "PDF processing failed:",
        error
      );

      /*
        If processing failed after the physical
        file was uploaded, try to remove it.
      */

      try {
        if (
          req.file?.path &&
          fs.existsSync(
            req.file.path
          )
        ) {
          fs.unlinkSync(
            req.file.path
          );
        }
      } catch (cleanupError) {
        console.error(
          "Failed to clean up uploaded file:",
          cleanupError.message
        );
      }

      return res.status(500).json({
        status: "ERROR",
        message:
          error.message
      });
    }
  }
);

/* ============================================================
   EXPORT
============================================================ */

module.exports = router;