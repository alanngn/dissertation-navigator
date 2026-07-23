"use client";

import { useMemo, useState } from "react";
import {
  FindingsList,
  type FindingsEditor,
} from "@/components/audit/FindingsList";
import { SEVERITY_CONFIG } from "@/components/audit/severity-config";
import type { FindingFormValues } from "@/components/audit/FindingForm";
import { useToast } from "@/components/providers/ToastProvider";
import { ChevronRightIcon } from "@/components/ui/icons";
import { agentColorClass, agentInitial } from "@/lib/agent-display";
import {
  type AgentAuditResult,
  type AuditReport,
  type FindingSeverity,
  aggregateFindings,
  agentWorstSeverity,
  countFindings,
  totalFindingCount,
} from "@/lib/audit-types";
import { formatDate } from "@/lib/format";
import { parseApiResponse } from "@/lib/parse-api-response";

type ReportView = "overview" | "recommendations";

type AuditReportPanelProps = {
  report: AuditReport;
  editable?: boolean;
};

const VIEW_TABS: { id: ReportView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "recommendations", label: "Areas for Improvement" },
];

type ReportApiResponse = {
  report?: AuditReport;
  error?: string;
};

export function AuditReportPanel({
  report: initialReport,
  editable = false,
}: AuditReportPanelProps) {
  const toast = useToast();
  const [report, setReport] = useState(initialReport);
  const [view, setView] = useState<ReportView>("overview");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completed = report.agentResults.filter((r) => r.status === "completed");
  const allFindings = aggregateFindings(report.agentResults);
  const findingTotal = totalFindingCount(report);

  const sectionOptions = useMemo(
    () =>
      completed
        .filter((result): result is AgentAuditResult & { id: string } =>
          Boolean(result.id),
        )
        .map((result) => ({
          id: result.id,
          name: result.agentName,
        })),
    [completed],
  );

  async function mutateReport(
    request: Promise<Response>,
  ): Promise<AuditReport> {
    const response = await request;
    const data = await parseApiResponse<ReportApiResponse>(response);

    if (!response.ok || !data.report) {
      throw new Error(data.error ?? "Failed to update finding.");
    }

    setReport(data.report);
    return data.report;
  }

  function createEditor(defaultSectionId?: string): FindingsEditor | undefined {
    if (!editable) return undefined;

    return {
      sectionOptions,
      defaultSectionId,
      allowNewSection: !defaultSectionId,
      onCreate: async (values, section) => {
        await mutateReport(
          fetch(`/api/audits/${report.slug}/findings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...values,
              ...("sectionName" in section
                ? { sectionName: section.sectionName }
                : { sectionId: section.sectionId }),
            }),
          }),
        );
        toast.success("Finding added.");
      },
      onUpdate: async (findingId, values: FindingFormValues) => {
        await mutateReport(
          fetch(`/api/audits/${report.slug}/findings/${findingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          }),
        );
        toast.success("Finding saved.");
      },
      onDelete: async (findingId) => {
        await mutateReport(
          fetch(`/api/audits/${report.slug}/findings/${findingId}`, {
            method: "DELETE",
          }),
        );
        toast.success("Finding deleted.");
      },
    };
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Audit Report</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {report.fileName} · {formatDate(report.completedAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <SeverityTotal severity="red" count={report.totals.red} />
            <SeverityTotal severity="yellow" count={report.totals.yellow} />
            <SeverityTotal severity="green" count={report.totals.green} />
          </div>
        </div>

        <nav className="mt-5 flex gap-1 rounded-lg bg-zinc-100 p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === tab.id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-6 py-5">
        {view === "overview" ? (
          <OverviewView
            report={report}
            completedCount={completed.length}
            findingTotal={findingTotal}
            expandedId={expandedId}
            editable={editable}
            createEditor={createEditor}
            onToggleAgent={(agentId) =>
              setExpandedId((current) => (current === agentId ? null : agentId))
            }
            onViewRecommendations={() => setView("recommendations")}
          />
        ) : (
          <div>
            <p className="mb-2 text-sm text-zinc-600">
              {findingTotal} findings identified across {completed.length}{" "}
              validation areas. Review the feedback below to strengthen your
              dissertation.
              {editable ? " Edit, add, or remove findings below." : ""}
            </p>
            <p className="mb-4 text-sm text-zinc-500">
              The findings below are organized by validation agent. Review each
              recommendation to improve dissertation quality and alignment.
            </p>
            <FindingsList
              findings={allFindings}
              showSection
              editor={createEditor()}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function OverviewView({
  report,
  completedCount,
  findingTotal,
  expandedId,
  editable,
  createEditor,
  onToggleAgent,
  onViewRecommendations,
}: {
  report: AuditReport;
  completedCount: number;
  findingTotal: number;
  expandedId: string | null;
  editable: boolean;
  createEditor: (defaultSectionId?: string) => FindingsEditor | undefined;
  onToggleAgent: (agentId: string) => void;
  onViewRecommendations: () => void;
}) {
  const hasCritical = report.totals.red > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-zinc-50 px-4 py-4">
        <p className="text-sm font-medium text-zinc-900">
          {completedCount}/{report.agentsRun} validation areas completed ·{" "}
          {findingTotal} total findings
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {hasCritical
            ? `${report.totals.red} critical issue${report.totals.red !== 1 ? "s" : ""} need attention.`
            : report.totals.yellow > 0
              ? "No critical issues. Review recommended improvements."
              : "No critical or moderate issues found."}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          By Section
        </h3>
        <div className="overflow-hidden rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {report.agentResults.map((result, index) => (
            <AgentAccordionRow
              key={result.id ?? result.agentId}
              result={result}
              index={index}
              expanded={expandedId === result.agentId}
              editor={
                editable && result.id
                  ? createEditor(result.id)
                  : undefined
              }
              onToggle={() => onToggleAgent(result.agentId)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onViewRecommendations}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
      >
        View areas for improvement
      </button>
    </div>
  );
}

function AgentAccordionRow({
  result,
  index,
  expanded,
  editor,
  onToggle,
}: {
  result: AgentAuditResult;
  index: number;
  expanded: boolean;
  editor?: FindingsEditor;
  onToggle: () => void;
}) {
  const counts =
    result.status === "completed"
      ? countFindings(result.findings)
      : { red: 0, yellow: 0, green: 0 };
  const worst =
    result.status === "completed"
      ? agentWorstSeverity(result.findings)
      : "none";

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        disabled={result.status === "failed"}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 disabled:cursor-default disabled:hover:bg-white"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${agentColorClass(index)}`}
        >
          {agentInitial(result.agentName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-zinc-900">
              {result.agentName}
            </p>
            {result.status === "failed" ? (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Failed
              </span>
            ) : worst !== "none" ? (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_CONFIG[worst as FindingSeverity].dot}`}
              />
            ) : null}
          </div>
          {result.status === "completed" && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{result.summary}</p>
          )}
          {result.status === "failed" && (
            <p className="mt-0.5 truncate text-xs text-red-600">
              {result.error ?? "Analysis failed"}
            </p>
          )}
        </div>

        {result.status === "completed" && (
          <div className="flex shrink-0 items-center gap-2">
            <MiniCounts counts={counts} />
            <ChevronRightIcon
              className={`text-zinc-400 transition ${expanded ? "rotate-90" : ""}`}
            />
          </div>
        )}
      </button>

      {expanded && result.status === "completed" && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-4">
          <FindingsList findings={result.findings} editor={editor} />
        </div>
      )}
    </div>
  );
}

function SeverityTotal({
  severity,
  count,
}: {
  severity: FindingSeverity;
  count: number;
}) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${config.border} ${config.bg}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
      <div>
        <p className={`text-lg font-semibold leading-none ${config.text}`}>
          {count}
        </p>
        <p
          className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${config.text}`}
        >
          {config.label}
        </p>
        <p className={`mt-0.5 text-[10px] leading-snug ${config.text} opacity-80`}>
          {config.description}
        </p>
      </div>
    </div>
  );
}

function MiniCounts({ counts }: { counts: Record<FindingSeverity, number> }) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      {(["red", "yellow", "green"] as const).map((severity) =>
        counts[severity] > 0 ? (
          <span key={severity} className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${SEVERITY_CONFIG[severity].dot}`}
            />
            {counts[severity]}
          </span>
        ) : null,
      )}
    </div>
  );
}
