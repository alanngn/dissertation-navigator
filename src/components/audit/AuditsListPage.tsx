"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { ProjectSummary } from "@/lib/audit-types";
import { totalFindingCount } from "@/lib/audit-types";
import { formatDateTime } from "@/lib/format";
import { parseApiResponse } from "@/lib/parse-api-response";

type ProjectsApiResponse = {
  projects: ProjectSummary[];
  error?: string;
};

export function AuditsListPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects");
      const data = await parseApiResponse<ProjectsApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load projects.");
      }

      setProjects(data.projects);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Audit History
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse projects by most recent audit activity.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {loading && (
          <p className="px-6 py-16 text-center text-sm text-zinc-400">
            Loading projects…
          </p>
        )}

        {!loading && error && (
          <p className="mx-6 my-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-700">No projects yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Create a project when you run your first audit from the dashboard.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Go to dashboard
            </Link>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <ul className="divide-y divide-zinc-100">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  const latest = project.latestAudit;
  const findingTotal = latest ? totalFindingCount(latest) : 0;
  const hasCritical = (latest?.totals.red ?? 0) > 0;

  return (
    <li>
      <Link
        href={`/audits/projects/${project.id}`}
        className="group flex items-center gap-4 px-6 py-4 transition hover:bg-zinc-50"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-600">
          {project.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">
            {project.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {project.auditCount} audit{project.auditCount !== 1 ? "s" : ""}
            {latest
              ? ` · Latest: ${latest.fileName} · ${formatDateTime(latest.completedAt)}`
              : " · No audits yet"}
          </p>
        </div>

        {latest && (
          <>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {latest.totals.red > 0 && (
                <SeverityDot severity="red" count={latest.totals.red} />
              )}
              {latest.totals.yellow > 0 && (
                <SeverityDot severity="yellow" count={latest.totals.yellow} />
              )}
              {latest.totals.green > 0 && (
                <SeverityDot severity="green" count={latest.totals.green} />
              )}
            </div>

            <div className="shrink-0 text-right">
              <p
                className={`text-xs font-medium ${
                  hasCritical ? "text-red-600" : "text-zinc-500"
                }`}
              >
                {hasCritical
                  ? `${latest.totals.red} critical`
                  : latest.totals.yellow > 0
                    ? "Review recommended"
                    : findingTotal > 0
                      ? "Looks good"
                      : "No findings"}
              </p>
              <ChevronRightIcon className="ml-auto mt-1 text-zinc-300 transition group-hover:text-zinc-500" />
            </div>
          </>
        )}

        {!latest && (
          <ChevronRightIcon className="shrink-0 text-zinc-300 transition group-hover:text-zinc-500" />
        )}
      </Link>
    </li>
  );
}

function SeverityDot({
  severity,
  count,
}: {
  severity: "red" | "yellow" | "green";
  count: number;
}) {
  const dot = {
    red: "bg-red-500",
    yellow: "bg-amber-400",
    green: "bg-emerald-500",
  }[severity];

  return (
    <span className="flex items-center gap-1 text-xs text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {count}
    </span>
  );
}
