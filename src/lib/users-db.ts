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

export async function ensureUser(
  id: string,
  name?: string,
): Promise<UserSummary> {
  const prisma = getPrisma();
  const displayName = name?.trim() || formatSessionUserName(id);
  const email = `session-${id}@local`;

  return prisma.user.upsert({
    where: { id },
    create: {
      id,
      email,
      name: displayName,
      role: "user",
    },
    update: {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}
