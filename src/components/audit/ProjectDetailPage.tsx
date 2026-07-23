"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DeleteAuditButton } from "@/components/audit/DeleteAuditButton";
import { SEVERITY_CONFIG } from "@/components/audit/severity-config";
import { ArrowLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { AuditSummary, ProjectDetail } from "@/lib/audit-types";
import { totalFindingCount } from "@/lib/audit-types";
import { formatDateTime } from "@/lib/format";
import { parseApiResponse } from "@/lib/parse-api-response";

type ProjectApiResponse = {
  project: ProjectDetail;
  error?: string;
};

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await parseApiResponse<ProjectApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load project.");
      }

      setProject(data.project);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load project.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  function handleDeleted(slug: string) {
    setProject((current) => {
      if (!current) return current;
      return {
        ...current,
        audits: current.audits.filter((audit) => audit.slug !== slug),
      };
    });
  }

  const latestAudit = project?.audits[0] ?? null;
  const priorAudits = project?.audits.slice(1) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6">
        <Link
          href="/audits"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <ArrowLeftIcon />
          All projects
        </Link>
      </div>

      {loading && (
        <p className="py-16 text-center text-sm text-zinc-400">
          Loading project…
        </p>
      )}

      {!loading && error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && project && (
        <>
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {project.audits.length} audit
              {project.audits.length !== 1 ? "s" : ""} · Newest first
            </p>
          </header>

          {project.audits.length === 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-sm font-medium text-zinc-700">
                No audits in this project yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Run an audit from the dashboard and assign it to this project.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Go to dashboard
              </Link>
            </section>
          )}

          {latestAudit && (
            <section className="mb-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Latest audit
              </p>
              <LatestAuditCard
                audit={latestAudit}
                onDeleted={() => handleDeleted(latestAudit.slug)}
              />
            </section>
          )}

          {priorAudits.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Previous audits
              </p>
              <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm divide-y divide-zinc-100">
                {priorAudits.map((audit) => (
                  <AuditRow
                    key={audit.id}
                    audit={audit}
                    onDeleted={() => handleDeleted(audit.slug)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LatestAuditCard({
  audit,
  onDeleted,
}: {
  audit: AuditSummary;
  onDeleted: () => void;
}) {
  const findingTotal = totalFindingCount(audit);
  const hasCritical = audit.totals.red > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-white shadow-sm">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <Link
          href={`/audits/${audit.slug}`}
          className="group flex min-w-0 flex-1 items-start gap-4"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white">
            {audit.fileName.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-zinc-900 group-hover:text-indigo-700">
              {audit.fileName}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {formatDateTime(audit.completedAt)} · {audit.agentsRun} agent
              {audit.agentsRun !== 1 ? "s" : ""} · {findingTotal} finding
              {findingTotal !== 1 ? "s" : ""}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SeverityPill severity="red" count={audit.totals.red} />
              <SeverityPill severity="yellow" count={audit.totals.yellow} />
              <SeverityPill severity="green" count={audit.totals.green} />
              <span
                className={`text-xs font-medium ${
                  hasCritical ? "text-red-600" : "text-zinc-500"
                }`}
              >
                {hasCritical
                  ? `${audit.totals.red} critical`
                  : audit.totals.yellow > 0
                    ? "Review recommended"
                    : "Looks good"}
              </span>
            </div>
          </div>

          <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 sm:inline-flex">
            View report
            <ChevronRightIcon />
          </span>
        </Link>

        <DeleteAuditButton
          slug={audit.slug}
          fileName={audit.fileName}
          onDeleted={onDeleted}
        />
      </div>
    </div>
  );
}

function AuditRow({
  audit,
  onDeleted,
}: {
  audit: AuditSummary;
  onDeleted: () => void;
}) {
  const findingTotal = totalFindingCount(audit);
  const hasCritical = audit.totals.red > 0;

  return (
    <li className="group flex items-center gap-2 pr-2">
      <Link
        href={`/audits/${audit.slug}`}
        className="flex min-w-0 flex-1 items-center gap-4 px-6 py-4 transition hover:bg-zinc-50"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-600">
          {audit.fileName.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">
            {audit.fileName}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {formatDateTime(audit.completedAt)} · {audit.agentsRun} agent
            {audit.agentsRun !== 1 ? "s" : ""} · {findingTotal} finding
            {findingTotal !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {audit.totals.red > 0 && (
            <SeverityDot severity="red" count={audit.totals.red} />
          )}
          {audit.totals.yellow > 0 && (
            <SeverityDot severity="yellow" count={audit.totals.yellow} />
          )}
          {audit.totals.green > 0 && (
            <SeverityDot severity="green" count={audit.totals.green} />
          )}
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`text-xs font-medium ${
              hasCritical ? "text-red-600" : "text-zinc-500"
            }`}
          >
            {hasCritical
              ? `${audit.totals.red} critical`
              : audit.totals.yellow > 0
                ? "Review recommended"
                : "Looks good"}
          </p>
          <ChevronRightIcon className="ml-auto mt-1 text-zinc-300 transition group-hover:text-zinc-500" />
        </div>
      </Link>

      <DeleteAuditButton
        slug={audit.slug}
        fileName={audit.fileName}
        onDeleted={onDeleted}
      />
    </li>
  );
}

function SeverityPill({
  severity,
  count,
}: {
  severity: "red" | "yellow" | "green";
  count: number;
}) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${config.border} ${config.bg} ${config.text}`}
    >
      {count} {config.label}
    </span>
  );
}

function SeverityDot({
  severity,
  count,
}: {
  severity: "red" | "yellow" | "green";
  count: number;
}) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <span className="flex items-center gap-1 text-xs text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {count}
    </span>
  );
}
