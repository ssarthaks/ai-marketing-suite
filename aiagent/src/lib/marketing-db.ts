import { Pool } from "pg";

/**
 * Optional connection to the Marketing Tool's Prisma database (the `User`
 * table). Used to accept logins from accounts created in the Marketing Tool
 * and to keep password hashes in sync. All callers must treat this as
 * best-effort: when MARKETING_DATABASE_URL is not configured, it is null.
 */
let pool: Pool | null = null;

export function getMarketingPool(): Pool | null {
  const connectionString = process.env.MARKETING_DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) {
    const url = new URL(connectionString);
    for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
      url.searchParams.delete(parameter);
    }
    pool = new Pool({
      connectionString: url.toString(),
      ssl: {
        rejectUnauthorized:
          process.env.NODE_ENV === "production" ||
          process.env.ALLOW_INSECURE_DATABASE_TLS !== "true",
      },
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 15_000,
      query_timeout: 20_000,
    });
  }
  return pool;
}

/** Look up a Marketing Tool account by email. Returns null on any failure. */
export async function findMarketingUser(
  email: string,
): Promise<{ email: string; password_hash: string } | null> {
  const marketing = getMarketingPool();
  if (!marketing) return null;
  try {
    const res = await marketing.query(
      'SELECT email, "passwordHash" AS password_hash FROM "User" WHERE email = $1',
      [email],
    );
    return res.rows[0] ?? null;
  } catch {
    console.error("Marketing DB lookup failed");
    return null;
  }
}

/** Best-effort: mirror a new password hash to the Marketing Tool account. */
export async function syncPasswordToMarketing(
  email: string | null | undefined,
  passwordHash: string,
): Promise<void> {
  const marketing = getMarketingPool();
  if (!marketing || !email) return;
  try {
    await marketing.query(
      'UPDATE "User" SET "passwordHash" = $1 WHERE email = $2',
      [passwordHash, email],
    );
  } catch {
    console.error("Marketing DB password sync failed");
  }
}
