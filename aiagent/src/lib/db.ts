import { Pool } from "pg";

const rawConnectionString = process.env.NEON_POSTREGSQL;

if (!rawConnectionString) {
  throw new Error("Missing NEON_POSTREGSQL environment variable");
}

function getVerifiedDatabaseConfig(connectionString: string) {
  const allowInsecureLocalTls =
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_INSECURE_DATABASE_TLS === "true";
  if (allowInsecureLocalTls) {
    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
    };
  }

  const url = new URL(connectionString);
  // pg lets URL ssl parameters replace the explicit TLS object. Remove those
  // parameters so certificate verification cannot silently be downgraded.
  for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    url.searchParams.delete(parameter);
  }
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  };
}

export const pool = new Pool({
  ...getVerifiedDatabaseConfig(rawConnectionString),
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 30_000,
  query_timeout: 35_000,
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV === "development") {
    console.debug("Database query completed", {
      durationMs: Date.now() - start,
      rows: res.rowCount,
    });
  }
  return res;
}
