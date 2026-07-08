import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import {
  normalizePreset,
  normalizeRules,
  type AgentRule,
  type InstructionPreset,
  type InstructionPresetStore,
} from "@/lib/instruction-presets";
import {
  GLOBAL_WORKSPACE_USER_EMAIL,
  GLOBAL_WORKSPACE_USER_ID,
  GLOBAL_WORKSPACE_USER_NAME,
  buildSeededPresets,
} from "@/lib/seed-agents";
import { ensureUser } from "@/lib/users-db";

function rulesToJson(rules: AgentRule[]): Prisma.InputJsonValue {
  return rules as unknown as Prisma.InputJsonValue;
}

function toClientPreset(preset: {
  id: string;
  name: string;
  purpose: string;
  businessFunction: string;
  rules: unknown;
  content: string;
  updatedAt: Date;
}): InstructionPreset {
  return normalizePreset({
    id: preset.id,
    name: preset.name,
    purpose: preset.purpose,
    businessFunction: preset.businessFunction,
    rules: normalizeRules(preset.rules),
    content: preset.content,
    updatedAt: preset.updatedAt.getTime(),
  });
}

/**
 * Ensures the shared workspace user exists and contains the seeded validation
 * agents. Seeding is idempotent: it inserts only the seed agents whose ids are
 * missing (matched on primary key), so existing agents — including user edits —
 * are never overwritten, while every deploy still guarantees the agents exist.
 * Safe to call on every workspace read.
 */
export async function ensureGlobalWorkspaceSeeded(): Promise<void> {
  const prisma = getPrisma();

  await prisma.user.upsert({
    where: { id: GLOBAL_WORKSPACE_USER_ID },
    create: {
      id: GLOBAL_WORKSPACE_USER_ID,
      email: GLOBAL_WORKSPACE_USER_EMAIL,
      name: GLOBAL_WORKSPACE_USER_NAME,
      role: "system",
    },
    update: {},
  });

  const seeded = buildSeededPresets();

  await prisma.instructionPreset.createMany({
    data: seeded.map((preset) => ({
      id: preset.id,
      userId: GLOBAL_WORKSPACE_USER_ID,
      name: preset.name,
      purpose: preset.purpose,
      businessFunction: preset.businessFunction,
      rules: rulesToJson(preset.rules),
      content: preset.content,
      updatedAt: new Date(preset.updatedAt),
    })),
    skipDuplicates: true,
  });

  const workspaceUser = await prisma.user.findUnique({
    where: { id: GLOBAL_WORKSPACE_USER_ID },
    select: { activePresetId: true },
  });

  if (!workspaceUser?.activePresetId && seeded[0]?.id) {
    await prisma.user.update({
      where: { id: GLOBAL_WORKSPACE_USER_ID },
      data: { activePresetId: seeded[0].id },
    });
  }
}

export async function loadPresetsFromDb(
  userId: string,
): Promise<InstructionPresetStore | null> {
  const prisma = getPrisma();

  const presets = await prisma.instructionPreset.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  if (presets.length === 0) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activePresetId: true },
  });

  const activeId =
    user?.activePresetId &&
    presets.some((preset) => preset.id === user.activePresetId)
      ? user.activePresetId
      : (presets[0]?.id ?? null);

  return {
    presets: presets.map(toClientPreset),
    activeId,
  };
}

export async function savePresetsToDb(
  userId: string,
  store: InstructionPresetStore,
): Promise<void> {
  const prisma = getPrisma();
  await ensureUser(userId);

  const ids = store.presets.map((preset) => preset.id);

  await prisma.$transaction(async (tx) => {
    for (const preset of store.presets) {
      await tx.instructionPreset.upsert({
        where: { id: preset.id },
        create: {
          id: preset.id,
          userId,
          name: preset.name,
          purpose: preset.purpose,
          businessFunction: preset.businessFunction,
          rules: rulesToJson(preset.rules),
          content: preset.content,
          updatedAt: new Date(preset.updatedAt),
        },
        update: {
          name: preset.name,
          purpose: preset.purpose,
          businessFunction: preset.businessFunction,
          rules: rulesToJson(preset.rules),
          content: preset.content,
          updatedAt: new Date(preset.updatedAt),
        },
      });
    }

    if (ids.length > 0) {
      await tx.instructionPreset.deleteMany({
        where: { userId, id: { notIn: ids } },
      });
    } else {
      await tx.instructionPreset.deleteMany({
        where: { userId },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: { activePresetId: store.activeId },
    });
  });
}
