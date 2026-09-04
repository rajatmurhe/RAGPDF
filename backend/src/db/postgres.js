const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: String(process.env.POSTGRES_PASSWORD),
  database: process.env.POSTGRES_DB
});

pool.on("connect", () => {
  console.log("PostgreSQL connected successfully");
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

module.exports = pool;