import { getPrisma } from "@/lib/db";
import { formatSessionUserName } from "@/lib/session-user";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export async function listUsers(): Promise<UserSummary[]> {
  const prisma = getPrisma();

  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

type EnsureUserInput = {
  name?: string;
  email?: string;
};

export async function ensureUser(
  id: string,
  input?: EnsureUserInput,
): Promise<UserSummary> {
  const prisma = getPrisma();
  const displayName = input?.name?.trim() || formatSessionUserName(id);
  const email = input?.email?.trim() || `session-${id}@local`;

  return prisma.user.upsert({
    where: { id },
    create: {
      id,
      email,
      name: displayName,
      role: "user",
    },
    update: {
      name: displayName,
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}
