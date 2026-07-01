import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteAuditBySlug, getAuditBySlug } from "@/lib/audits-db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

  try {
    const report = await getAuditBySlug(slug.trim());
    if (!report) {
      return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to load audit:", error);
    return NextResponse.json(
      { error: "Failed to load audit." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  try {
    const deleted = await deleteAuditBySlug(slug.trim());
    if (!deleted) {
      return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete audit:", error);
    return NextResponse.json(
      { error: "Failed to delete audit." },
      { status: 500 },
    );
  }
}
