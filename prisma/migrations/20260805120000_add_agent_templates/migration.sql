-- CreateTable
CREATE TABLE "AgentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "businessFunction" TEXT NOT NULL DEFAULT '',
    "rules" JSONB NOT NULL DEFAULT '[]',
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTemplate_pkey" PRIMARY KEY ("id")
);

-- Step A: Populate templates from global-workspace presets (idempotent)
INSERT INTO "AgentTemplate" ("id", "name", "purpose", "businessFunction", "rules", "content", "sortOrder", "updatedAt", "createdAt")
SELECT
    p."id",
    p."name",
    p."purpose",
    p."businessFunction",
    p."rules",
    p."content",
    (ROW_NUMBER() OVER (ORDER BY p."createdAt", p."id")) - 1,
    p."updatedAt",
    p."createdAt"
FROM "InstructionPreset" p
WHERE p."userId" = 'global-workspace'
  AND NOT EXISTS (SELECT 1 FROM "AgentTemplate" LIMIT 1);

-- Step B: Provision existing users who have no presets yet
INSERT INTO "InstructionPreset" ("id", "userId", "name", "purpose", "businessFunction", "rules", "content", "updatedAt", "createdAt")
SELECT
    gen_random_uuid()::text,
    u."id",
    t."name",
    t."purpose",
    t."businessFunction",
    t."rules",
    t."content",
    NOW(),
    NOW()
FROM "User" u
CROSS JOIN "AgentTemplate" t
WHERE u."role" != 'system'
  AND NOT EXISTS (
    SELECT 1 FROM "InstructionPreset" p WHERE p."userId" = u."id"
  )
ORDER BY u."id", t."sortOrder", t."id";

-- Set activePresetId for provisioned users
UPDATE "User" u
SET "activePresetId" = sub."presetId"
FROM (
    SELECT DISTINCT ON (p."userId")
        p."userId",
        p."id" AS "presetId"
    FROM "InstructionPreset" p
    INNER JOIN "AgentTemplate" t ON t."name" = p."name"
    ORDER BY p."userId", t."sortOrder", t."id"
) sub
WHERE u."id" = sub."userId"
  AND u."role" != 'system'
  AND (u."activePresetId" IS NULL OR NOT EXISTS (
    SELECT 1 FROM "InstructionPreset" p WHERE p."id" = u."activePresetId" AND p."userId" = u."id"
  ));

-- Step C: Retire global-workspace presets
DELETE FROM "InstructionPreset"
WHERE "userId" = 'global-workspace';

DELETE FROM "User"
WHERE "id" = 'global-workspace';
