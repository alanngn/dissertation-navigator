/**
 * Verification script for per-user agent isolation.
 * Run: npx tsx scripts/verify-agent-isolation.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const TEST_USER_A = "test-verify-user-a";
const TEST_USER_B = "test-verify-user-b";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { getPrisma } = await import("@/lib/db");
  const { ensureAgentTemplatesSeeded, listAgentTemplates, provisionAgentsFromTemplates } =
    await import("@/lib/agent-templates-db");
  const { ensureUser } = await import("@/lib/users-db");
  const { loadPresetsFromDb, savePresetsToDb } = await import(
    "@/lib/instruction-presets-db"
  );

  const prisma = getPrisma();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed += 1;
    } else {
      console.error(`  ✗ ${message}`);
      failed += 1;
    }
  }

  console.log("\n=== Agent Isolation Verification ===\n");

  // Cleanup from prior runs
  await prisma.instructionPreset.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [TEST_USER_A, TEST_USER_B] } },
  });

  console.log("1. Default templates");
  await ensureAgentTemplatesSeeded();
  const templates = await listAgentTemplates();
  assert(templates.length >= 8, `At least 8 agent templates exist (got ${templates.length})`);
  assert(
    templates.some((t) => t.id === "seed-topic-title"),
    "Template seed-topic-title exists",
  );

  const globalWorkspace = await prisma.user.findUnique({
    where: { id: "global-workspace" },
  });
  assert(globalWorkspace === null, "global-workspace user was retired");

  const globalPresets = await prisma.instructionPreset.count({
    where: { userId: "global-workspace" },
  });
  assert(globalPresets === 0, "No presets remain on global-workspace");

  console.log("\n2. User provisioning on signup");
  await ensureUser(TEST_USER_A, {
    name: "Verify User A",
    email: "verify-a@test.local",
  });

  const userAPresets = await loadPresetsFromDb(TEST_USER_A);
  assert(
    userAPresets !== null && userAPresets.presets.length === templates.length,
    `User A got ${templates.length} agents on signup (got ${userAPresets?.presets.length ?? 0})`,
  );
  assert(
    userAPresets!.presets.every((p) => !p.id.startsWith("seed-")),
    "User A presets have unique ids (not seed-* ids)",
  );

  console.log("\n3. Per-user isolation");
  await ensureUser(TEST_USER_B, {
    name: "Verify User B",
    email: "verify-b@test.local",
  });

  const userBPresets = await loadPresetsFromDb(TEST_USER_B);
  assert(userBPresets !== null, "User B got agents on signup");

  const userAIds = new Set(userAPresets!.presets.map((p) => p.id));
  const userBIds = new Set(userBPresets!.presets.map((p) => p.id));
  const overlap = [...userAIds].filter((id) => userBIds.has(id));
  assert(overlap.length === 0, "User A and User B have distinct preset ids");

  // Edit User A's first agent name
  const editedName = "User A Custom Agent Name";
  const editedPresets = userAPresets!.presets.map((p, i) =>
    i === 0 ? { ...p, name: editedName, updatedAt: Date.now() } : p,
  );
  await savePresetsToDb(TEST_USER_A, {
    presets: editedPresets,
    activeId: userAPresets!.activeId,
  });

  const userAReloaded = await loadPresetsFromDb(TEST_USER_A);
  const userBReloaded = await loadPresetsFromDb(TEST_USER_B);
  assert(
    userAReloaded!.presets[0]!.name === editedName,
    "User A edit persisted",
  );
  assert(
    userBReloaded!.presets[0]!.name !== editedName,
    "User B was not affected by User A's edit",
  );

  console.log("\n4. Idempotent provisioning");
  const reprovisioned = await provisionAgentsFromTemplates(TEST_USER_A);
  assert(reprovisioned === false, "Re-provisioning skipped when user already has agents");

  const countAfter = await prisma.instructionPreset.count({
    where: { userId: TEST_USER_A },
  });
  assert(
    countAfter === templates.length,
    "Preset count unchanged after skipped re-provision",
  );

  // Cleanup
  await prisma.instructionPreset.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [TEST_USER_A, TEST_USER_B] } },
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
