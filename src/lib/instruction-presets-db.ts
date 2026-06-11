import { getPrisma } from "@/lib/db";
import type {
  InstructionPreset,
  InstructionPresetStore,
} from "@/lib/instruction-presets";
import { ensureUser } from "@/lib/users-db";

function toClientPreset(preset: {
  id: string;
  name: string;
  content: string;
  updatedAt: Date;
}): InstructionPreset {
  return {
    id: preset.id,
    name: preset.name,
    content: preset.content,
    updatedAt: preset.updatedAt.getTime(),
  };
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
          content: preset.content,
          updatedAt: new Date(preset.updatedAt),
        },
        update: {
          name: preset.name,
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
