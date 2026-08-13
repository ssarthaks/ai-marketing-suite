import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function secureDatasourceUrl(): string {
  const configured = process.env.DATABASE_URL;
  if (!configured) throw new Error("DATABASE_URL is required");

  const url = new URL(configured);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL must use PostgreSQL");
  }
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!isLoopback) {
    // Prisma 6 otherwise defaults to accepting invalid certificates. Force
    // encryption and CA/hostname validation for every remote connection.
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("sslaccept", "strict");
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("A loopback DATABASE_URL is not allowed in production");
  }
  return url.toString();
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: secureDatasourceUrl(),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
