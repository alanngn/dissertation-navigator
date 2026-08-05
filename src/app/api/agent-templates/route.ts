import { NextResponse } from "next/server";
import {
  ensureAgentTemplatesSeeded,
  listAgentTemplates,
  saveAgentTemplates,
  type AgentTemplateSummary,
} from "@/lib/agent-templates-db";
import { requireAdminUserId, requireAuthUserId } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  isAgentRulePriority,
  type AgentRule,
} from "@/lib/instruction-presets";

function isValidRule(rule: unknown): rule is AgentRule {
  if (!rule || typeof rule !== "object") return false;
  const candidate = rule as { text?: unknown; priority?: unknown };
  return (
    typeof candidate.text === "string" && isAgentRulePriority(candidate.priority)
  );
}

function isValidTemplate(body: unknown): body is AgentTemplateSummary {
  if (!body || typeof body !== "object") return false;

  const template = body as AgentTemplateSummary;
  return (
    typeof template.id === "string" &&
    typeof template.name === "string" &&
    typeof template.purpose === "string" &&
    typeof template.businessFunction === "string" &&
    Array.isArray(template.rules) &&
    template.rules.every(isValidRule) &&
    typeof template.content === "string" &&
    typeof template.sortOrder === "number" &&
    typeof template.updatedAt === "number"
  );
}

function isValidTemplatesPayload(
  body: unknown,
): body is { templates: AgentTemplateSummary[] } {
  if (!body || typeof body !== "object") return false;
  const payload = body as { templates?: unknown };
  return (
    Array.isArray(payload.templates) && payload.templates.every(isValidTemplate)
  );
}

export async function GET() {
  const authUserId = await requireAuthUserId();
  if (!authUserId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  try {
    await ensureAgentTemplatesSeeded();
    const templates = await listAgentTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to load agent templates:", error);
    return NextResponse.json(
      { error: "Failed to load agent templates." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) {
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

  if (!isValidTemplatesPayload(body)) {
    return NextResponse.json(
      { error: "Invalid agent templates payload." },
      { status: 400 },
    );
  }

  if (body.templates.length === 0) {
    return NextResponse.json(
      { error: "At least one template is required." },
      { status: 400 },
    );
  }

  try {
    await saveAgentTemplates(body.templates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save agent templates:", error);
    return NextResponse.json(
      { error: "Failed to save agent templates." },
      { status: 500 },
    );
  }
}
