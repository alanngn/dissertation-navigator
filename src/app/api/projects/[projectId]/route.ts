import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getProjectById } from "@/lib/projects-db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  try {
    const { projectId } = await context.params;
    const project = await getProjectById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Failed to load project:", error);
    return NextResponse.json(
      { error: "Failed to load project." },
      { status: 500 },
    );
  }
}
