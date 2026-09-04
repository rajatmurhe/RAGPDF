const express = require("express");

const {
  answerQuestion,
} = require("../services/rag.service");

const router =
  express.Router();

router.post(
  "/",
  async (req, res) => {
    try {
      const {
        question,
        filename,
        history,
      } = req.body;

      /* ========================================================
         TEMPORARY HISTORY DEBUG
         
         This lets us verify exactly what the frontend sends
         to the backend for conversational follow-ups.
      ======================================================== */

      console.log(
        "REQUEST HISTORY DEBUG:",
        {
          historyLength:
            Array.isArray(history)
              ? history.length
              : 0,

          roles:
            Array.isArray(history)
              ? history.map(
                  (item) =>
                    item?.role
                )
              : [],
        }
      );

      /* ========================================================
         VALIDATION
      ======================================================== */

      if (
        !question ||
        !question.trim()
      ) {
        return res.status(400).json({
          status: "ERROR",
          message:
            "Question is required",
        });
      }

      if (
        !filename ||
        !filename.trim()
      ) {
        return res.status(400).json({
          status: "ERROR",
          message:
            "A document must be selected before asking a question.",
        });
      }

      const cleanQuestion =
        question.trim();

      const cleanFilename =
        filename.trim();

      const cleanHistory =
        Array.isArray(history)
          ? history
              .filter(
                (item) =>
                  item &&
                  (
                    item.role ===
                      "user" ||
                    item.role ===
                      "assistant"
                  ) &&
                  typeof item.content ===
                    "string" &&
                  item.content.trim()
              )
              .slice(-8)
              .map(
                (item) => ({
                  role:
                    item.role,
                  content:
                    item.content
                      .trim(),
                })
              )
          : [];

      console.log(
        "========================================"
      );

      console.log(
        "Query received:",
        cleanQuestion
      );

      console.log(
        "Selected document:",
        cleanFilename
      );

      console.log(
        "Conversation history messages:",
        cleanHistory.length
      );

      console.log(
        "========================================"
      );

      /* ========================================================
         ANSWER
      ======================================================== */

      const result =
        await answerQuestion(
          cleanQuestion,
          6,
          cleanFilename,
          cleanHistory
        );

      res.json({
        status: "OK",
        question:
          cleanQuestion,
        filename:
          cleanFilename,
        answer:
          result.answer,
        sources:
          result.sources ||
          [],
      });
    } catch (error) {
      console.error(
        "Query failed:",
        error
      );

      res.status(500).json({
        status: "ERROR",
        message:
          error.message ||
          "Failed to answer question",
      });
    }
  }
);

module.exports =
  router;