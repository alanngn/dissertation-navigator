-- Convert rules from TEXT[] to JSON so each rule can store priority.
-- Legacy string entries become { "text": "<rule>", "priority": "critical" }.
-- PostgreSQL does not allow subqueries in ALTER COLUMN USING expressions,
-- so we migrate via a temporary column and an UPDATE.

ALTER TABLE "InstructionPreset"
  ALTER COLUMN "rules" DROP DEFAULT;

ALTER TABLE "InstructionPreset"
  ADD COLUMN "rules_new" JSONB NOT NULL DEFAULT '[]';

UPDATE "InstructionPreset"
SET "rules_new" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'text', rule_text,
        'priority', 'critical'
      )
    )
    FROM unnest("rules") AS rule_text
  ),
  '[]'::jsonb
)
WHERE "rules" IS NOT NULL AND cardinality("rules") > 0;

ALTER TABLE "InstructionPreset"
  DROP COLUMN "rules";

ALTER TABLE "InstructionPreset"
  RENAME COLUMN "rules_new" TO "rules";

ALTER TABLE "InstructionPreset"
  ALTER COLUMN "rules" SET DEFAULT '[]'::jsonb;
