-- Add structured agent inputs (purpose, business function, rules) to presets
ALTER TABLE "InstructionPreset"
    ADD COLUMN "purpose" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "businessFunction" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "rules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill the purpose from existing single-string instructions
UPDATE "InstructionPreset"
SET "purpose" = "content"
WHERE "purpose" = '' AND "content" <> '';
