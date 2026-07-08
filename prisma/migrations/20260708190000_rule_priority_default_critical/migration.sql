-- Existing rules were initially migrated with moderate priority; promote them to critical.

UPDATE "InstructionPreset"
SET "rules" = COALESCE(
  (
    SELECT jsonb_agg(
      CASE
        WHEN rule->>'priority' = 'moderate' THEN jsonb_set(rule, '{priority}', '"critical"')
        ELSE rule
      END
    )
    FROM jsonb_array_elements("rules") AS rule
  ),
  '[]'::jsonb
)
WHERE jsonb_array_length("rules") > 0;

UPDATE "PlatformSettings"
SET "rules" = COALESCE(
  (
    SELECT jsonb_agg(
      CASE
        WHEN rule->>'priority' = 'moderate' THEN jsonb_set(rule, '{priority}', '"critical"')
        ELSE rule
      END
    )
    FROM jsonb_array_elements("rules") AS rule
  ),
  '[]'::jsonb
)
WHERE jsonb_array_length("rules") > 0;
