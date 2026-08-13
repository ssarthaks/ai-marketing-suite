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

    console.log("Adding pro model access tracking columns to users table...");

    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS pro_model_access BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS pro_model_requested BOOLEAN DEFAULT FALSE;
    `);

    // Give admins default access to the pro model
    await query(`
      UPDATE users 
      SET pro_model_access = TRUE 
      WHERE role = 'admin' AND pro_model_access = FALSE;
    `);

    console.log(
      "Migration successful: Added pro_model_access and pro_model_requested to users.",
    );
    process.exit(0);
  } catch {
    console.error("Migration failed");
    process.exit(1);
  }
}

run();
