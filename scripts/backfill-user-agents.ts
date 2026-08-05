/**
 * Backfill missing default agents for users with incomplete workspaces.
 *
 * Usage:
 *   npx tsx scripts/backfill-user-agents.ts              # all users
 *   npx tsx scripts/backfill-user-agents.ts --dry-run      # preview only
 *   npx tsx scripts/backfill-user-agents.ts --user-id=abc # single user
 *
 * Production (Vercel): POST /api/admin/backfill-agents
 *   - Admin Clerk session, or Authorization: Bearer $BACKFILL_SECRET
 *   - Body: { "dryRun": true } to preview, { "dryRun": false } to apply
 *   - Optional: { "userId": "clerk_user_id" } for a single user
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const userIdArg = argv.find((arg) => arg.startsWith("--user-id="));
  const userId = userIdArg?.slice("--user-id=".length).trim() || undefined;

  return { dryRun, userId };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { dryRun, userId } = parseArgs(process.argv.slice(2));

  const { getPrisma } = await import("@/lib/db");
  const {
    backfillAllUsersMissingAgents,
    ensureAgentTemplatesSeeded,
    listAgentTemplates,
    previewBackfillAllUsersMissingAgents,
  } = await import("@/lib/agent-templates-db");

  const prisma = getPrisma();

  await ensureAgentTemplatesSeeded();
  const templates = await listAgentTemplates();

  console.log("\n=== Backfill Missing User Agents ===\n");
  console.log(`Templates available: ${templates.length}`);
  console.log(`Mode: ${dryRun ? "dry-run (no writes)" : "apply"}`);
  if (userId) {
    console.log(`Scope: user ${userId}`);
  } else {
    console.log("Scope: all non-system users");
  }
  console.log("");

  if (dryRun) {
    const preview = await previewBackfillAllUsersMissingAgents(
      userId ? { userId } : undefined,
    );

    if (preview.length === 0) {
      console.log("No matching users found.");
      await prisma.$disconnect();
      return;
    }

    let wouldAdd = 0;

    for (const user of preview) {
      console.log(`${user.userName} (${user.userId})`);
      console.log(`  Current: ${user.existingCount} agents`);
      console.log(`  Missing: ${user.missingCount}`);

      if (user.missingNames.length > 0) {
        for (const name of user.missingNames) {
          console.log(`    + ${name}`);
        }
        wouldAdd += user.missingCount;
      } else {
        console.log("    (up to date)");
      }

      console.log("");
    }

    console.log(`Would add ${wouldAdd} agent(s) total.\n`);
    await prisma.$disconnect();
    return;
  }

  const results = await backfillAllUsersMissingAgents(
    userId ? { userId } : undefined,
  );

  if (results.length === 0) {
    console.log("No matching users found.");
    await prisma.$disconnect();
    return;
  }

  let totalAdded = 0;

  for (const result of results) {
    const afterCount = result.existingCount + result.addedCount;
    console.log(`${result.userName} (${result.userId})`);
    console.log(`  Before: ${result.existingCount} agents`);
    console.log(`  Added:  ${result.addedCount}`);

    if (result.addedNames.length > 0) {
      for (const name of result.addedNames) {
        console.log(`    + ${name}`);
      }
    } else {
      console.log("    (up to date)");
    }

    console.log(`  After:  ${afterCount} agents\n`);
    totalAdded += result.addedCount;
  }

  console.log(`Done. Added ${totalAdded} agent(s) across ${results.length} user(s).\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
