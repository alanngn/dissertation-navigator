import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createProject, listProjects } from "@/lib/projects-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId")?.trim() || null;
    const search = url.searchParams.get("search")?.trim() || null;
    const projects = await listProjects({ userId, search });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json(
      { error: "Failed to load projects." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: unknown;
      userId?: unknown;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const userId =
      typeof body.userId === "string" ? body.userId.trim() || null : null;

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required." },
        { status: 400 },
      );
    }

    const project = await createProject({ name, userId });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
