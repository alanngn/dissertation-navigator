import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { ensureUser, listUsers } from "@/lib/users-db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to list users:", error);
    return NextResponse.json(
      { error: "Failed to list users." },
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { id, name } = body as { id?: unknown; name?: unknown };

  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  if (name !== undefined && typeof name !== "string") {
    return NextResponse.json({ error: "Invalid user name." }, { status: 400 });
  }

  try {
    const user = await ensureUser(id.trim(), name);
    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to ensure user:", error);
    return NextResponse.json(
      { error: "Failed to register user." },
      { status: 500 },
    );
  }
}
