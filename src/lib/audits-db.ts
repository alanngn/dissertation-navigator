import { getPrisma } from "@/lib/db";
import { createAuditSlug } from "@/lib/audit-slug";
import {
  type AgentAuditResult,
  type AuditReport,
  type AuditSummary,
  mergeTotals,
} from "@/lib/audit-types";

type SaveAuditInput = {
  userId?: string | null;
  fileName: string;
  agentResults: AgentAuditResult[];
};

function toAuditReport(
  run: {
    id: string;
    slug: string;
    fileName: string;
    completedAt: Date;
    agentsRun: number;
    agentsFailed: number;
    redTotal: number;
    yellowTotal: number;
    greenTotal: number;
    agentResults: Array<{
      agentId: string;
      agentName: string;
      status: string;
      summary: string;
      rawOutput: string;
      error: string | null;
      findings: Array<{
        severity: string;
        title: string;
        detail: string;
      }>;
    }>;
  },
): AuditReport {
  return {
    id: run.id,
    slug: run.slug,
    fileName: run.fileName,
    completedAt: run.completedAt.getTime(),
    agentsRun: run.agentsRun,
    agentsFailed: run.agentsFailed,
    totals: {
      red: run.redTotal,
      yellow: run.yellowTotal,
      green: run.greenTotal,
    },
    agentResults: run.agentResults.map((result) => ({
      agentId: result.agentId,
      agentName: result.agentName,
      status: result.status as "completed" | "failed",
      summary: result.summary,
      findings: result.findings.map((finding) => ({
        severity: finding.severity as "red" | "yellow" | "green",
        title: finding.title,
        detail: finding.detail,
      })),
      rawOutput: result.rawOutput,
      error: result.error ?? undefined,
    })),
  };
}

const auditInclude = {
  agentResults: {
    include: {
      findings: true,
    },
  },
};

export async function saveAuditRun(input: SaveAuditInput): Promise<AuditReport> {
  const prisma = getPrisma();
  const totals = mergeTotals(input.agentResults);
  const agentsFailed = input.agentResults.filter(
    (r) => r.status === "failed",
  ).length;
  const auditId = crypto.randomUUID();
  const slug = createAuditSlug();

  await prisma.auditRun.create({
    data: {
      id: auditId,
      slug,
      userId: input.userId ?? null,
      fileName: input.fileName,
      agentsRun: input.agentResults.length,
      agentsFailed,
      redTotal: totals.red,
      yellowTotal: totals.yellow,
      greenTotal: totals.green,
      agentResults: {
        create: input.agentResults.map((result) => ({
          id: crypto.randomUUID(),
          agentId: result.agentId,
          agentName: result.agentName,
          status: result.status,
          summary: result.summary,
          rawOutput: result.rawOutput,
          error: result.error ?? null,
          ...(result.findings.length > 0
            ? {
                findings: {
                  create: result.findings.map((finding) => ({
                    id: crypto.randomUUID(),
                    severity: finding.severity,
                    title: finding.title,
                    detail: finding.detail,
                  })),
                },
              }
            : {}),
        })),
      },
    },
  });

  const saved = await prisma.auditRun.findUniqueOrThrow({
    where: { id: auditId },
    include: auditInclude,
  });

  return toAuditReport(saved);
}

export async function getAuditBySlug(slug: string): Promise<AuditReport | null> {
  const prisma = getPrisma();
  const run = await prisma.auditRun.findUnique({
    where: { slug },
    include: auditInclude,
  });

  if (!run) return null;
  return toAuditReport(run);
}

export async function getAuditById(id: string): Promise<AuditReport | null> {
  const prisma = getPrisma();
  const run = await prisma.auditRun.findUnique({
    where: { id },
    include: auditInclude,
  });

  if (!run) return null;
  return toAuditReport(run);
}

export async function listAuditSummaries(
  options: { userId?: string | null; limit?: number } = {},
): Promise<AuditSummary[]> {
  const prisma = getPrisma();
  const limit = options.limit ?? 100;

  const runs = await prisma.auditRun.findMany({
    where: options.userId ? { userId: options.userId } : undefined,
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      fileName: true,
      completedAt: true,
      agentsRun: true,
      agentsFailed: true,
      redTotal: true,
      yellowTotal: true,
      greenTotal: true,
    },
  });

  return runs.map((run) => ({
    id: run.id,
    slug: run.slug,
    fileName: run.fileName,
    completedAt: run.completedAt.getTime(),
    agentsRun: run.agentsRun,
    agentsFailed: run.agentsFailed,
    totals: {
      red: run.redTotal,
      yellow: run.yellowTotal,
      green: run.greenTotal,
    },
  }));
}

export async function deleteAuditBySlug(slug: string): Promise<boolean> {
  const prisma = getPrisma();
  const existing = await prisma.auditRun.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!existing) return false;

  await prisma.auditRun.delete({ where: { slug } });
  return true;
}
