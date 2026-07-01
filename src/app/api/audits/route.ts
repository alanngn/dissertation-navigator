import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listAuditSummaries } from "@/lib/audits-db";

export const dynamic = "force-dynamic";

function getUserIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const queryUserId = url.searchParams.get("userId");
  return queryUserId?.trim() || null;
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  try {
    const userId = getUserIdFromRequest(request);
    const audits = await listAuditSummaries({ userId });
    return NextResponse.json({ audits });
  } catch (error) {
    console.error("Failed to list audits:", error);
    return NextResponse.json(
      { error: "Failed to load audits." },
      { status: 500 },
    );
  }
}
