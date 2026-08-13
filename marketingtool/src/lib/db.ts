import { Pool } from "pg";

const connectionString = process.env.NEON_POSTREGSQL;

if (!connectionString) {
  throw new Error("Missing NEON_POSTREGSQL environment variable");
}

const databaseUrl = new URL(connectionString);
const isLocalDatabase =
  databaseUrl.hostname === "localhost" ||
  databaseUrl.hostname === "127.0.0.1" ||
  databaseUrl.hostname === "::1";
// pg connection-string TLS parameters can replace the explicit `ssl` object.
// Remove them so a URL cannot silently downgrade certificate verification.
for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
  databaseUrl.searchParams.delete(parameter);
}

export const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: isLocalDatabase ? false : { rejectUnauthorized: true },
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 30_000,
  query_timeout: 35_000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV === "development") {
    console.debug("database query completed", {
      durationMs: Date.now() - start,
      rows: res.rowCount,
    });
  }
  return res;
}
