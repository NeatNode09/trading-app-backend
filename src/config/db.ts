import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  user: env.pgUser,
  host: env.pgHost,
  database: env.pgDatabase,
  password: env.pgPassword,
  port: env.pgPort,
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));
