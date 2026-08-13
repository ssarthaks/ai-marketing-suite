import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import pkg from "pg";
import { getDatabaseConfig } from "./db-config";

const { Pool } = pkg;
const ALLOWED_ROLES = new Set(["user", "team_lead", "admin"]);

type SeedUser = { email: string; role: string };

function getSeedUsers(): SeedUser[] {
  if (!process.env.SEED_USERS_JSON) {
    throw new Error(
      "SEED_USERS_JSON is required (JSON array of {email, role}); no accounts are embedded in source control",
    );
  }
  const parsed = JSON.parse(process.env.SEED_USERS_JSON);
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 100) {
    throw new Error("SEED_USERS_JSON must contain between 1 and 100 users");
  }
  return parsed.map((value): SeedUser => {
    if (
      !value ||
      typeof value.email !== "string" ||
      value.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ||
      typeof value.role !== "string" ||
      !ALLOWED_ROLES.has(value.role)
    ) {
      throw new Error("SEED_USERS_JSON contains an invalid user");
    }
    return { email: value.email.trim().toLowerCase(), role: value.role };
  });
}

async function run() {
  const pool = new Pool({
    ...(await getDatabaseConfig({
      allowProductionFlag: "ALLOW_PRODUCTION_SEED",
    })),
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        force_password_change BOOLEAN DEFAULT TRUE,
        deleted_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pro_model_access BOOLEAN DEFAULT FALSE,
        pro_model_requested BOOLEAN DEFAULT FALSE
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS threads (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        title_generated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        attachments JSONB,
        usage JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let inserted = 0;
    for (const user of getSeedUsers()) {
      // Seeded accounts receive a unique unknown credential and must use the
      // password-reset email flow. No reusable password is logged or shared.
      const passwordHash = await bcrypt.hash(
        `${crypto.randomBytes(24).toString("base64url")}!aA1`,
        12,
      );
      const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, role, force_password_change)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (email) DO NOTHING`,
        [crypto.randomUUID(), user.email, passwordHash, user.role],
      );
      inserted += result.rowCount || 0;
    }

    console.log(
      `Seeded ${inserted} new account(s). Users must complete the password-reset email flow.`,
    );
  } finally {
    await pool.end();
  }
}

run().catch(() => {
  console.error("User seeding failed");
  process.exitCode = 1;
});
