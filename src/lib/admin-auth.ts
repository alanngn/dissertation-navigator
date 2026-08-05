import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/db";

export function getAdminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export async function requireAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function isAdminUser(userId: string): Promise<boolean> {
  if (getAdminUserIds().has(userId)) {
    return true;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === "admin";
}

export async function requireAdminUserId(): Promise<string | null> {
  const userId = await requireAuthUserId();
  if (!userId) {
    return null;
  }

  const isAdmin = await isAdminUser(userId);
  return isAdmin ? userId : null;
}

/**
 * Allows admin Clerk sessions or a BACKFILL_SECRET bearer token for one-off
 * production operations (e.g. curl against Vercel without a browser session).
 */
export async function requireBackfillAccess(
  request: Request,
): Promise<string | null> {
  const secret = process.env.BACKFILL_SECRET?.trim();
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${secret}`) {
      return "backfill-secret";
    }
  }

  return requireAdminUserId();
}
