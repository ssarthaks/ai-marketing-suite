import pkg from "pg";
const { Pool } = pkg;
import { getDatabaseConfig } from "./db-config";

async function run() {
  try {
    const pool = new Pool({
      ...(await getDatabaseConfig()),
      connectionTimeoutMillis: 5_000,
      statement_timeout: 30_000,
    });

    const query = (text: string, params?: unknown[]) =>
      pool.query(text, params);

    console.log("Adding token tracking columns to users table...");

    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS total_input_tokens BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15, 6) DEFAULT 0;
    `);

    console.log("Successfully added token tracking columns.");
    process.exit(0);
  } catch {
    console.error("Migration failed");
    process.exit(1);
  }
}

run();
