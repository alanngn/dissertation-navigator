"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DeleteAuditButton } from "@/components/audit/DeleteAuditButton";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { AuditSummary } from "@/lib/audit-types";
import { totalFindingCount } from "@/lib/audit-types";
import { formatDateTime } from "@/lib/format";
import { parseApiResponse } from "@/lib/parse-api-response";

type AuditsApiResponse = {
  audits: AuditSummary[];
  error?: string;
};

export function AuditsListPage() {
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/audits");
      const data = await parseApiResponse<AuditsApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load audits.");
      }

      setAudits(data.audits);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load audits.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAudits();
  }, [loadAudits]);

  function handleDeleted(slug: string) {
    setAudits((current) => current.filter((audit) => audit.slug !== slug));
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Audits
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse previous dissertation audits and reopen any report.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {loading && (
          <p className="px-6 py-16 text-center text-sm text-zinc-400">
            Loading audits…
          </p>
        )}

        {!loading && error && (
          <p className="mx-6 my-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && audits.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-700">No audits yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Run your first audit from the dashboard to see it here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Go to dashboard
            </Link>
          </div>
        )}

        {!loading && !error && audits.length > 0 && (
          <ul className="divide-y divide-zinc-100">
            {audits.map((audit) => (
              <AuditRow
                key={audit.id}
                audit={audit}
                onDeleted={() => handleDeleted(audit.slug)}
              />
            ))}
          </ul>
        )}
      </section>
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
