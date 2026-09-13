import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value || !value.includes("neon.tech")) return value;
  const url = new URL(value);
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: getDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
