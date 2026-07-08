import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import {
  normalizeRules,
  type AgentRule,
} from "@/lib/instruction-presets";
import {
  createDefaultPlatformSettings,
  normalizePlatformSettings,
  PLATFORM_SETTINGS_ID,
  type PlatformSettings,
} from "@/lib/platform-settings";

function rulesToJson(rules: AgentRule[]): Prisma.InputJsonValue {
  return rules as unknown as Prisma.InputJsonValue;
}

function toClientSettings(row: {
  id: string;
  version: string;
  preamble: string;
  rules: unknown;
  updatedAt: Date;
}): PlatformSettings {
  return normalizePlatformSettings({
    id: row.id,
    version: row.version,
    preamble: row.preamble,
    rules: normalizeRules(row.rules),
    updatedAt: row.updatedAt.getTime(),
  });
}

/**
 * Ensures the singleton platform settings row exists with default rules.
 * Only inserts on first deploy; existing edits are preserved.
 */
export async function ensurePlatformSettingsSeeded(): Promise<void> {
  const prisma = getPrisma();
  const defaults = createDefaultPlatformSettings();

  await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: {
      id: PLATFORM_SETTINGS_ID,
      version: defaults.version,
      preamble: defaults.preamble,
      rules: rulesToJson(defaults.rules),
      updatedAt: new Date(defaults.updatedAt),
    },
    update: {},
  });
}

export async function loadPlatformSettingsFromDb(): Promise<PlatformSettings | null> {
  const prisma = getPrisma();
  const row = await prisma.platformSettings.findUnique({
    where: { id: PLATFORM_SETTINGS_ID },
  });

  if (!row) {
    return null;
  }

  return toClientSettings(row);
}

export async function savePlatformSettingsToDb(
  settings: PlatformSettings,
): Promise<void> {
  const prisma = getPrisma();

  await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: {
      id: PLATFORM_SETTINGS_ID,
      version: settings.version,
      preamble: settings.preamble,
      rules: rulesToJson(settings.rules),
      updatedAt: new Date(settings.updatedAt),
    },
    update: {
      version: settings.version,
      preamble: settings.preamble,
      rules: rulesToJson(settings.rules),
      updatedAt: new Date(settings.updatedAt),
    },
  });
}

/**
 * Resolves platform rules for server-side agent analysis.
 * Falls back to seeded defaults when the database is unavailable.
 */
export async function getPlatformSettingsForAnalysis(): Promise<PlatformSettings> {
  try {
    await ensurePlatformSettingsSeeded();
    const fromDb = await loadPlatformSettingsFromDb();
    if (fromDb) {
      return fromDb;
    }
  } catch (error) {
    console.warn("Failed to load platform settings from database:", error);
  }

  return createDefaultPlatformSettings();
}
