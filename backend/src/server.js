require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./db/postgres");
const redisClient = require("./db/redis");
const { connectMongoDB } = require("./db/mongodb");

const documentRoutes = require("./routes/document.routes");
const { answerQuestion } = require("./services/rag.service");

const app = express();
const PORT = process.env.PORT || 5050;

/* =====================================================
   CORS
===================================================== */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests / tools that do not send Origin.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* =====================================================
   BODY PARSING
===================================================== */

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   HEALTH
===================================================== */

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "OK",
      message: "RAG PDF backend is running",
      database: "PostgreSQL connected",
      redis: redisClient.isOpen ? "connected" : "not connected",
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

/* =====================================================
   PDF / DOCUMENT ROUTES
===================================================== */

app.use("/api/documents", documentRoutes);

/* =====================================================
   RAG QUERY

   Every query MUST belong to exactly one selected document.
===================================================== */

app.post("/api/query", async (req, res) => {
  try {
    const { question, filename, history } = req.body || {};

    if (
      !question ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "Question is required",
      });
    }

    if (
      !filename ||
      typeof filename !== "string" ||
      !filename.trim()
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "A document must be selected before asking a question",
      });
    }

    const cleanQuestion = question.trim();
    const cleanFilename = filename.trim();
    const cleanHistory = Array.isArray(history)
      ? history.slice(-8)
      : [];

    console.log("========================================");
    console.log("Query received:", cleanQuestion);
    console.log("Selected document:", cleanFilename);
    console.log("Conversation history messages:", cleanHistory.length);
    console.log("========================================");

    const result = await answerQuestion(
      cleanQuestion,
      6,
      cleanFilename,
      cleanHistory
    );

    console.log("Query answered successfully");

    return res.json({
      status: "OK",
      question: cleanQuestion,
      filename: cleanFilename,
      answer: result.answer,
      sources: result.sources || [],
    });
  } catch (error) {
    console.error("Query failed:", error);

    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Failed to answer question",
    });
  }
});

/* =====================================================
   ROOT
===================================================== */

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "RAG PDF API is running",
    endpoints: {
      health: "GET /api/health",
      upload: "POST /api/documents/upload",
      query: "POST /api/query",
    },
  });
});

/* =====================================================
   404
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    status: "ERROR",
    message: "Route not found",
    path: req.originalUrl,
  });
});

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    status: "ERROR",
    message: err.message || "Internal server error",
  });
});

/* =====================================================
   START SERVER
===================================================== */

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully");

    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Redis connected successfully");
    } else {
      console.log("Redis already connected");
    }

    await connectMongoDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health: /api/health`);
      console.log(`Upload: POST /api/documents/upload`);
      console.log(`Query: POST /api/query`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();