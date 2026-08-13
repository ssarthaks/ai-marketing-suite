import fs from "node:fs/promises";

export async function getDatabaseConfig(options?: {
  allowProductionFlag?: string;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env[
      options?.allowProductionFlag || "ALLOW_PRODUCTION_MIGRATIONS"
    ] !== "true"
  ) {
    throw new Error(
      "Refusing to modify a production database without approval",
    );
  }

  let connectionString = process.env.NEON_POSTREGSQL;
  if (!connectionString) {
    const envContent = await fs.readFile(".env", "utf8");
    const envLine = envContent
      .split(/\r?\n/)
      .find((line) => line.startsWith("NEON_POSTREGSQL="));
    connectionString = envLine
      ?.slice("NEON_POSTREGSQL=".length)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
  if (!connectionString) {
    throw new Error("Missing NEON_POSTREGSQL");
  }

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
  for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    url.searchParams.delete(parameter);
  }
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  };
}
