import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import {
  createPresetId,
  normalizeRules,
  type AgentRule,
} from "@/lib/instruction-presets";
import { buildSeededPresets } from "@/lib/seed-agents";

function rulesToJson(rules: AgentRule[]): Prisma.InputJsonValue {
  return rules as unknown as Prisma.InputJsonValue;
}

export type AgentTemplateSummary = {
  id: string;
  name: string;
  purpose: string;
  businessFunction: string;
  rules: AgentRule[];
  content: string;
  sortOrder: number;
  updatedAt: number;
};

/**
 * Ensures default agent templates exist. Inserts only missing template ids so
 * deploy-time seeding never overwrites admin edits in production.
 */
export async function ensureAgentTemplatesSeeded(): Promise<void> {
  const prisma = getPrisma();
  const seeded = buildSeededPresets();

  await prisma.agentTemplate.createMany({
    data: seeded.map((preset, index) => ({
      id: preset.id,
      name: preset.name,
      purpose: preset.purpose,
      businessFunction: preset.businessFunction,
      rules: rulesToJson(preset.rules),
      content: preset.content,
      sortOrder: index,
      updatedAt: new Date(preset.updatedAt),
    })),
    skipDuplicates: true,
  });
}

export async function listAgentTemplates(): Promise<AgentTemplateSummary[]> {
  const prisma = getPrisma();

  const templates = await prisma.agentTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    purpose: template.purpose,
    businessFunction: template.businessFunction,
    rules: normalizeRules(template.rules),
    content: template.content,
    sortOrder: template.sortOrder,
    updatedAt: template.updatedAt.getTime(),
  }));
}

/**
 * Clones all default templates into a user's workspace. No-op when the user
 * already has agents. Returns true when provisioning ran.
 */
export async function provisionAgentsFromTemplates(
  userId: string,
): Promise<boolean> {
  const prisma = getPrisma();

  const existingCount = await prisma.instructionPreset.count({
    where: { userId },
  });

  if (existingCount > 0) {
    return false;
  }

  await ensureAgentTemplatesSeeded();

  const templates = await prisma.agentTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  if (templates.length === 0) {
    return false;
  }

  const now = new Date();
  const presets = templates.map((template) => ({
    id: createPresetId(),
    userId,
    name: template.name,
    purpose: template.purpose,
    businessFunction: template.businessFunction,
    rules: template.rules as Prisma.InputJsonValue,
    content: template.content,
    updatedAt: now,
    createdAt: now,
  }));

  await prisma.$transaction(async (tx) => {
    for (const preset of presets) {
      await tx.instructionPreset.create({ data: preset });
    }

    await tx.user.update({
      where: { id: userId },
      data: { activePresetId: presets[0]!.id },
    });
  });

  return true;
}

export type BackfillUserResult = {
  userId: string;
  userName: string;
  existingCount: number;
  addedCount: number;
  addedNames: string[];
};

export type BackfillPreviewResult = {
  userId: string;
  userName: string;
  existingCount: number;
  missingCount: number;
  missingNames: string[];
};

async function listBackfillTargetUsers(userId?: string) {
  const prisma = getPrisma();

  return userId
    ? prisma.user.findMany({
        where: { id: userId, role: { not: "system" } },
        select: {
          id: true,
          name: true,
          presets: { select: { name: true } },
        },
      })
    : prisma.user.findMany({
        where: { role: { not: "system" } },
        select: {
          id: true,
          name: true,
          presets: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      });
}

function getMissingTemplateNames(
  existingPresetNames: string[],
  templateNames: string[],
): string[] {
  const existingNames = new Set(
    existingPresetNames.map((name) => name.trim().toLowerCase()),
  );

  return templateNames.filter(
    (name) => !existingNames.has(name.trim().toLowerCase()),
  );
}

export async function previewBackfillAllUsersMissingAgents(options?: {
  userId?: string;
}): Promise<BackfillPreviewResult[]> {
  await ensureAgentTemplatesSeeded();

  const templates = await listAgentTemplates();
  const templateNames = templates.map((template) => template.name);
  const users = await listBackfillTargetUsers(options?.userId);

  return users.map((user) => {
    const missingNames = getMissingTemplateNames(
      user.presets.map((preset) => preset.name),
      templateNames,
    );

    return {
      userId: user.id,
      userName: user.name,
      existingCount: user.presets.length,
      missingCount: missingNames.length,
      missingNames,
    };
  });
}

/**
 * Adds default templates missing from a user's workspace, matched by agent name.
 * Existing presets are never modified or removed.
 */
export async function backfillMissingAgentsFromTemplates(
  userId: string,
): Promise<BackfillUserResult | null> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      activePresetId: true,
      presets: {
        select: { id: true, name: true },
      },
    },
  });

  if (!user || user.role === "system") {
    return null;
  }

  await ensureAgentTemplatesSeeded();

  const templates = await prisma.agentTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  if (templates.length === 0) {
    return {
      userId: user.id,
      userName: user.name,
      existingCount: user.presets.length,
      addedCount: 0,
      addedNames: [],
    };
  }

  const existingNames = new Set(
    user.presets.map((preset) => preset.name.trim().toLowerCase()),
  );

  const missingTemplates = templates.filter(
    (template) => !existingNames.has(template.name.trim().toLowerCase()),
  );

  if (missingTemplates.length === 0) {
    return {
      userId: user.id,
      userName: user.name,
      existingCount: user.presets.length,
      addedCount: 0,
      addedNames: [],
    };
  }

  const now = new Date();
  const newPresets = missingTemplates.map((template) => ({
    id: createPresetId(),
    userId: user.id,
    name: template.name,
    purpose: template.purpose,
    businessFunction: template.businessFunction,
    rules: template.rules as Prisma.InputJsonValue,
    content: template.content,
    updatedAt: now,
    createdAt: now,
  }));

  await prisma.$transaction(async (tx) => {
    for (const preset of newPresets) {
      await tx.instructionPreset.create({ data: preset });
    }

    const activeStillValid =
      user.activePresetId !== null &&
      user.presets.some((preset) => preset.id === user.activePresetId);

    if (!activeStillValid) {
      const firstTemplate = templates[0]!;
      const matchingPreset =
        user.presets.find((preset) => preset.name === firstTemplate.name) ??
        newPresets.find((preset) => preset.name === firstTemplate.name);

      if (matchingPreset) {
        await tx.user.update({
          where: { id: user.id },
          data: { activePresetId: matchingPreset.id },
        });
      }
    }
  });

  return {
    userId: user.id,
    userName: user.name,
    existingCount: user.presets.length,
    addedCount: newPresets.length,
    addedNames: newPresets.map((preset) => preset.name),
  };
}

export async function backfillAllUsersMissingAgents(options?: {
  userId?: string;
}): Promise<BackfillUserResult[]> {
  const users = await listBackfillTargetUsers(options?.userId);

  const results: BackfillUserResult[] = [];

  for (const user of users) {
    const result = await backfillMissingAgentsFromTemplates(user.id);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

export async function saveAgentTemplates(
  templates: AgentTemplateSummary[],
): Promise<void> {
  const prisma = getPrisma();
  const ids = templates.map((template) => template.id);

  await prisma.$transaction(async (tx) => {
    for (const [index, template] of templates.entries()) {
      await tx.agentTemplate.upsert({
        where: { id: template.id },
        create: {
          id: template.id,
          name: template.name,
          purpose: template.purpose,
          businessFunction: template.businessFunction,
          rules: rulesToJson(template.rules),
          content: template.content,
          sortOrder: index,
          updatedAt: new Date(template.updatedAt),
        },
        update: {
          name: template.name,
          purpose: template.purpose,
          businessFunction: template.businessFunction,
          rules: rulesToJson(template.rules),
          content: template.content,
          sortOrder: index,
          updatedAt: new Date(template.updatedAt),
        },
      });
    }

    if (ids.length > 0) {
      await tx.agentTemplate.deleteMany({
        where: { id: { notIn: ids } },
      });
    } else {
      await tx.agentTemplate.deleteMany();
    }
  });
}
