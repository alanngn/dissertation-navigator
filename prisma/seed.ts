import { config } from "dotenv";
import { resolve } from "node:path";

// Load env the same way prisma.config.ts does, so the seed script works both
// locally (.env.local) and on the deploy host (process env already populated).
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set — skipping agent seeding.");
    return;
  }

  const { ensureGlobalWorkspaceSeeded } = await import(
    "@/lib/instruction-presets-db"
  );
  const { getPrisma } = await import("@/lib/db");

  await ensureGlobalWorkspaceSeeded();
  console.log("Seeded shared-workspace validation agents.");

  await getPrisma().$disconnect();
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
