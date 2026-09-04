const { MongoClient } = require("mongodb");

let client = null;
let db = null;

async function connectMongoDB() {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn(
      "MongoDB URI not configured - MongoDB disabled"
    );
    return null;
  }

  try {
    client = new MongoClient(mongoURI);

    await client.connect();

    db = client.db(
      process.env.MONGODB_DB || "ragpdf"
    );

    console.log("MongoDB connected successfully");

    return db;
  } catch (error) {
    console.warn(
      "MongoDB connection failed - continuing without MongoDB:",
      error.message
    );

    client = null;
    db = null;

    return null;
  }
}

function getDB() {
  if (!db) {
    throw new Error("MongoDB is not connected");
  }

  return db;
}

module.exports = {
  connectMongoDB,
  getDB,
};