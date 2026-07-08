import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { isAgentRulePriority } from "@/lib/instruction-presets";
import {
  createDefaultPlatformSettings,
  normalizePlatformSettings,
  type PlatformSettings,
} from "@/lib/platform-settings";
import {
  ensurePlatformSettingsSeeded,
  loadPlatformSettingsFromDb,
  savePlatformSettingsToDb,
} from "@/lib/platform-settings-db";

function isValidRule(rule: unknown): boolean {
  if (!rule || typeof rule !== "object") return false;
  const candidate = rule as { text?: unknown; priority?: unknown };
  return (
    typeof candidate.text === "string" && isAgentRulePriority(candidate.priority)
  );
}

function isValidSettings(body: unknown): body is PlatformSettings {
  if (!body || typeof body !== "object") return false;
  const settings = body as PlatformSettings;
  return (
    typeof settings.id === "string" &&
    typeof settings.version === "string" &&
    typeof settings.preamble === "string" &&
    Array.isArray(settings.rules) &&
    settings.rules.every(isValidRule) &&
    typeof settings.updatedAt === "number"
  );
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ...createDefaultPlatformSettings(),
      source: "unconfigured" as const,
    });
  }

  try {
    await ensurePlatformSettingsSeeded();
    const settings = await loadPlatformSettingsFromDb();

    if (!settings) {
      return NextResponse.json({
        ...createDefaultPlatformSettings(),
        source: "default" as const,
      });
    }

    return NextResponse.json({
      ...settings,
      source: "database" as const,
    });
  } catch (error) {
    console.error("Failed to load platform settings:", error);
    return NextResponse.json(
      { error: "Failed to load platform settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidSettings(body)) {
    return NextResponse.json(
      { error: "Invalid platform settings payload." },
      { status: 400 },
    );
  }

  const settings = normalizePlatformSettings({
    ...body,
    updatedAt: Date.now(),
  });

  try {
    await savePlatformSettingsToDb(settings);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("Failed to save platform settings:", error);
    return NextResponse.json(
      { error: "Failed to save platform settings." },
      { status: 500 },
    );
  }
}
