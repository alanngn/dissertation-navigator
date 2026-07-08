import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteAuditFinding, updateAuditFinding } from "@/lib/audits-db";
import { normalizeFindingInput } from "@/lib/audit-types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string; findingId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { slug, findingId } = await context.params;

  if (!slug?.trim() || !findingId?.trim()) {
    return NextResponse.json(
      { error: "Audit slug and finding id are required." },
      { status: 400 },
    );
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
  const finding = normalizeFindingInput({
    severity: payload.severity,
    title: payload.title,
    detail: payload.detail,
    example: payload.example,
  });

  if (!finding) {
    return NextResponse.json(
      { error: "A valid severity, title, and detail are required." },
      { status: 400 },
    );
  }

  try {
    const report = await updateAuditFinding(
      slug.trim(),
      findingId.trim(),
      finding,
    );
    if (!report) {
      return NextResponse.json({ error: "Finding not found." }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to update audit finding:", error);
    return NextResponse.json(
      { error: "Failed to update finding." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { slug, findingId } = await context.params;

  if (!slug?.trim() || !findingId?.trim()) {
    return NextResponse.json(
      { error: "Audit slug and finding id are required." },
      { status: 400 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  try {
    const report = await deleteAuditFinding(slug.trim(), findingId.trim());
    if (!report) {
      return NextResponse.json({ error: "Finding not found." }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to delete audit finding:", error);
    return NextResponse.json(
      { error: "Failed to delete finding." },
      { status: 500 },
    );
  }
}
