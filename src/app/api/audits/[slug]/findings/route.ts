import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createAuditFinding } from "@/lib/audits-db";
import { normalizeFindingInput } from "@/lib/audit-types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug?.trim()) {
    return NextResponse.json({ error: "Audit slug is required." }, { status: 400 });
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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const sectionId =
    typeof payload.sectionId === "string"
      ? payload.sectionId.trim()
      : typeof payload.agentResultId === "string"
        ? payload.agentResultId.trim()
        : "";
  const sectionName =
    typeof payload.sectionName === "string" ? payload.sectionName.trim() : "";

  if (!sectionId && !sectionName) {
    return NextResponse.json(
      { error: "A section or new section name is required." },
      { status: 400 },
    );
  }

  const finding = normalizeFindingInput({
    severity: payload.severity,
    title: payload.title,
    detail: payload.detail,
  });

  if (!finding) {
    return NextResponse.json(
      { error: "A valid severity, title, and detail are required." },
      { status: 400 },
    );
  }

  try {
    const report = await createAuditFinding(slug.trim(), finding, {
      sectionId: sectionName ? undefined : sectionId,
      sectionName: sectionName || undefined,
    });
    if (!report) {
      return NextResponse.json(
        { error: "Audit or section not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to create audit finding:", error);
    return NextResponse.json(
      { error: "Failed to create finding." },
      { status: 500 },
    );
  }
}
