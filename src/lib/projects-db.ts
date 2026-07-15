import { getPrisma } from "@/lib/db";
import type { Project, ProjectDetail, ProjectSummary } from "@/lib/audit-types";

export async function createProject(input: {
  name: string;
  userId?: string | null;
}): Promise<Project> {
  const prisma = getPrisma();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Project name is required.");
  }

  const id = crypto.randomUUID();
  const project = await prisma.project.create({
    data: {
      id,
      name,
      userId: input.userId ?? null,
    },
  });

  return {
    id: project.id,
    name: project.name,
    userId: project.userId,
    createdAt: project.createdAt.getTime(),
    updatedAt: project.updatedAt.getTime(),
  };
}

export async function listProjects(
  options: { userId?: string | null; search?: string | null } = {},
): Promise<ProjectSummary[]> {
  const prisma = getPrisma();
  const search = options.search?.trim();

  const projects = await prisma.project.findMany({
    where: {
      ...(options.userId ? { userId: options.userId } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    },
    include: {
      audits: {
        orderBy: { completedAt: "desc" },
        take: 1,
        select: {
          id: true,
          slug: true,
          projectId: true,
          fileName: true,
          completedAt: true,
          agentsRun: true,
          agentsFailed: true,
          redTotal: true,
          yellowTotal: true,
          greenTotal: true,
        },
      },
      _count: { select: { audits: true } },
    },
  });

  const summaries: ProjectSummary[] = projects.map((project) => {
    const latest = project.audits[0];
    return {
      id: project.id,
      name: project.name,
      auditCount: project._count.audits,
      latestAudit: latest
        ? {
            id: latest.id,
            slug: latest.slug,
            projectId: latest.projectId,
            projectName: project.name,
            fileName: latest.fileName,
            completedAt: latest.completedAt.getTime(),
            agentsRun: latest.agentsRun,
            agentsFailed: latest.agentsFailed,
            totals: {
              red: latest.redTotal,
              yellow: latest.yellowTotal,
              green: latest.greenTotal,
            },
          }
        : null,
    };
  });

  summaries.sort((a, b) => {
    const aTime = a.latestAudit?.completedAt ?? 0;
    const bTime = b.latestAudit?.completedAt ?? 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.name.localeCompare(b.name);
  });

  return summaries;
}

export async function getProjectById(
  id: string,
): Promise<ProjectDetail | null> {
  const prisma = getPrisma();
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      audits: {
        orderBy: { completedAt: "desc" },
        select: {
          id: true,
          slug: true,
          projectId: true,
          fileName: true,
          completedAt: true,
          agentsRun: true,
          agentsFailed: true,
          redTotal: true,
          yellowTotal: true,
          greenTotal: true,
        },
      },
    },
  });

  if (!project) return null;

  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.getTime(),
    updatedAt: project.updatedAt.getTime(),
    audits: project.audits.map((audit) => ({
      id: audit.id,
      slug: audit.slug,
      projectId: audit.projectId,
      projectName: project.name,
      fileName: audit.fileName,
      completedAt: audit.completedAt.getTime(),
      agentsRun: audit.agentsRun,
      agentsFailed: audit.agentsFailed,
      totals: {
        red: audit.redTotal,
        yellow: audit.yellowTotal,
        green: audit.greenTotal,
      },
    })),
  };
}
