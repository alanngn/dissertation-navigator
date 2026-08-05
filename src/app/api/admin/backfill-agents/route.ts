import { NextResponse } from "next/server";
import {
  backfillAllUsersMissingAgents,
  ensureAgentTemplatesSeeded,
  listAgentTemplates,
  previewBackfillAllUsersMissingAgents,
} from "@/lib/agent-templates-db";
import { requireBackfillAccess } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";

type BackfillRequestBody = {
  dryRun?: boolean;
  userId?: string;
};

function parseBody(body: unknown): BackfillRequestBody {
  if (!body || typeof body !== "object") {
    return {};
  }

  const payload = body as BackfillRequestBody;

  return {
    dryRun: payload.dryRun === true,
    userId:
      typeof payload.userId === "string" && payload.userId.trim()
        ? payload.userId.trim()
        : undefined,
  };
}

export async function POST(request: Request) {
  const actorId = await requireBackfillAccess(request);
  if (!actorId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { dryRun, userId } = parseBody(body);

  try {
    await ensureAgentTemplatesSeeded();
    const templates = await listAgentTemplates();

    if (dryRun) {
      const preview = await previewBackfillAllUsersMissingAgents(
        userId ? { userId } : undefined,
      );

      const totalMissing = preview.reduce(
        (sum, item) => sum + item.missingCount,
        0,
      );

      return NextResponse.json({
        ok: true,
        dryRun: true,
        templateCount: templates.length,
        userCount: preview.length,
        totalMissing,
        users: preview,
      });
    }

    const results = await backfillAllUsersMissingAgents(
      userId ? { userId } : undefined,
    );

    const totalAdded = results.reduce((sum, item) => sum + item.addedCount, 0);

    return NextResponse.json({
      ok: true,
      dryRun: false,
      templateCount: templates.length,
      userCount: results.length,
      totalAdded,
      users: results.map((result) => ({
        userId: result.userId,
        userName: result.userName,
        existingCount: result.existingCount,
        addedCount: result.addedCount,
        addedNames: result.addedNames,
        afterCount: result.existingCount + result.addedCount,
      })),
    });
  } catch (error) {
    console.error("Failed to backfill user agents:", error);
    return NextResponse.json(
      { error: "Failed to backfill user agents." },
      { status: 500 },
    );
  }
}
