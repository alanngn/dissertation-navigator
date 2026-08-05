import { NextResponse } from "next/server";
import { isAdminUser, requireAuthUserId } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  loadOrProvisionPresetsFromDb,
  savePresetsToDb,
} from "@/lib/instruction-presets-db";
import {
  isAgentRulePriority,
  type InstructionPresetStore,
} from "@/lib/instruction-presets";

function getUserIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const queryUserId = url.searchParams.get("userId");
  if (queryUserId?.trim()) {
    return queryUserId.trim();
  }

  return null;
}

function isValidRule(rule: unknown): boolean {
  if (!rule || typeof rule !== "object") return false;
  const candidate = rule as { text?: unknown; priority?: unknown };
  return (
    typeof candidate.text === "string" && isAgentRulePriority(candidate.priority)
  );
}

function isValidStore(body: unknown): body is InstructionPresetStore {
  if (!body || typeof body !== "object") return false;

  const store = body as InstructionPresetStore;
  if (!Array.isArray(store.presets)) return false;

  return store.presets.every(
    (preset) =>
      typeof preset.id === "string" &&
      typeof preset.name === "string" &&
      typeof preset.purpose === "string" &&
      typeof preset.businessFunction === "string" &&
      Array.isArray(preset.rules) &&
      preset.rules.every(isValidRule) &&
      typeof preset.content === "string" &&
      typeof preset.updatedAt === "number",
  );
}

async function canAccessUserPresets(
  authUserId: string,
  requestedUserId: string,
): Promise<boolean> {
  if (authUserId === requestedUserId) {
    return true;
  }

  return isAdminUser(authUserId);
}

export async function GET(request: Request) {
  const authUserId = await requireAuthUserId();
  if (!authUserId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter is required." },
      { status: 400 },
    );
  }

  if (!(await canAccessUserPresets(authUserId, userId))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      presets: [],
      activeId: null,
      source: "unconfigured" as const,
    });
  }

  try {
    const store = await loadOrProvisionPresetsFromDb(userId);

    if (!store) {
      return NextResponse.json({
        presets: [],
        activeId: null,
        source: "empty" as const,
      });
    }

    return NextResponse.json({
      ...store,
      source: "database" as const,
    });
  } catch (error) {
    console.error("Failed to load presets from database:", error);
    return NextResponse.json(
      { error: "Failed to load presets from database." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const authUserId = await requireAuthUserId();
  if (!authUserId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter is required." },
      { status: 400 },
    );
  }

  if (authUserId !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

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

  if (!isValidStore(body)) {
    return NextResponse.json(
      { error: "Invalid preset store payload." },
      { status: 400 },
    );
  }

  if (body.presets.length === 0) {
    return NextResponse.json(
      { error: "At least one preset is required." },
      { status: 400 },
    );
  }

  if (
    body.activeId !== null &&
    !body.presets.some((preset) => preset.id === body.activeId)
  ) {
    return NextResponse.json(
      { error: "Active preset must exist in the preset list." },
      { status: 400 },
    );
  }

  try {
    await savePresetsToDb(userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save presets to database:", error);
    return NextResponse.json(
      { error: "Failed to save presets to database." },
      { status: 500 },
    );
  }
}
