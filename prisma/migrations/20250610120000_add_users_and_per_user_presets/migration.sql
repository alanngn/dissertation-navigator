-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "activePresetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Seed default admin user before attaching presets
INSERT INTO "User" ("id", "email", "name", "role", "activePresetId", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@local',
    'Admin',
    'admin',
    NULL,
    CURRENT_TIMESTAMP
);

-- Add per-user ownership to presets
ALTER TABLE "InstructionPreset" ADD COLUMN "userId" TEXT;

UPDATE "InstructionPreset"
SET "userId" = '00000000-0000-0000-0000-000000000001'
WHERE "userId" IS NULL;

ALTER TABLE "InstructionPreset" ALTER COLUMN "userId" SET NOT NULL;

-- Move active preset from singleton settings to admin user
UPDATE "User"
SET "activePresetId" = (
    SELECT "activePresetId"
    FROM "PresetSettings"
    WHERE "id" = 'singleton'
    LIMIT 1
)
WHERE "id" = '00000000-0000-0000-0000-000000000001';

-- DropTable
DROP TABLE "PresetSettings";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "InstructionPreset_userId_idx" ON "InstructionPreset"("userId");

-- AddForeignKey
ALTER TABLE "InstructionPreset" ADD CONSTRAINT "InstructionPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
