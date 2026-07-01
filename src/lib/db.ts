import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Bump when new models are added so dev hot-reload picks up schema changes. */
const PRISMA_SCHEMA_GENERATION = 2;

const globalForPrismaMeta = globalThis as unknown as {
  prismaSchemaGeneration?: number;
};

function createPrismaClient(): PrismaClient {
  // Pooled connection string for serverless runtime (PgBouncer, Neon pooler, etc.).
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function isPrismaClientCurrent(client: PrismaClient | undefined): client is PrismaClient {
  if (!client) return false;
  // A cached client from before audit tables were added will not expose auditRun.
  return typeof client.auditRun?.create === "function";
}

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const generationMismatch =
    globalForPrismaMeta.prismaSchemaGeneration !== PRISMA_SCHEMA_GENERATION;

  if (
    !isPrismaClientCurrent(globalForPrisma.prisma) ||
    generationMismatch
  ) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrismaMeta.prismaSchemaGeneration = PRISMA_SCHEMA_GENERATION;
  }

  return globalForPrisma.prisma;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
