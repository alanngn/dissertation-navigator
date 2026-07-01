"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AuditReport } from "@/lib/audit-types";
import { totalFindingCount } from "@/lib/audit-types";
import { buildAuditLoadingSteps } from "@/lib/audit-loading-steps";
import { ShareAuditLink } from "@/components/audit/ShareAuditLink";

type AuditRunModalProps = {
  open: boolean;
  agentNames: string[];
  fileName: string | null;
  status: "running" | "success" | "error";
  report: AuditReport | null;
  error: string | null;
  onClose: () => void;
};

export function AuditRunModal({
  open,
  agentNames,
  fileName,
  status,
  report,
  error,
  onClose,
}: AuditRunModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => buildAuditLoadingSteps(), []);

  useEffect(() => {
    if (!open || status !== "running") return;

    setStepIndex(0);
    const interval = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % steps.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, [open, status, steps.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && status !== "running") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, status]);

  if (!open) return null;

  const findingTotal = report ? totalFindingCount(report) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        aria-label="Close audit dialog"
        onClick={status === "running" ? undefined : onClose}
        tabIndex={status === "running" ? -1 : 0}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {status === "running" && (
          <div className="px-8 pb-10 pt-2 text-center">
            <AgentShapeField />
            <h2
              id="audit-modal-title"
              className="mt-4 text-lg font-semibold text-zinc-900"
            >
              Working on your audit
            </h2>
            {fileName && (
              <p className="mt-1 truncate text-sm text-zinc-500">{fileName}</p>
            )}

            <div className="mt-6 flex min-h-[4.5rem] items-center justify-center px-2">
              <p
                key={stepIndex}
                className="audit-step-text text-sm leading-relaxed text-zinc-600"
              >
                {steps[stepIndex]}
              </p>
            </div>

            <p className="mt-6 text-xs text-zinc-400">
              {agentNames.length} agent{agentNames.length !== 1 ? "s" : ""}{" "}
              reviewing in parallel
            </p>
          </div>
        )}

        {status === "success" && report && (
          <div className="px-8 py-10 text-center">
            <SuccessIcon />
            <h2
              id="audit-modal-title"
              className="mt-6 text-lg font-semibold text-zinc-900"
            >
              Audit complete
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              {report.agentsRun - report.agentsFailed} of {report.agentsRun}{" "}
              agents finished · {findingTotal} finding
              {findingTotal !== 1 ? "s" : ""}
            </p>

            <div className="mt-6 flex justify-center gap-2">
              <SeverityPill severity="red" count={report.totals.red} />
              <SeverityPill severity="yellow" count={report.totals.yellow} />
              <SeverityPill severity="green" count={report.totals.green} />
            </div>

            <div className="mt-8 flex flex-col gap-2.5">
              <Link
                href={`/audits/${report.slug}`}
                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                View full report
              </Link>
              <ShareAuditLink slug={report.slug} variant="compact" />
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="px-8 py-10 text-center">
            <ErrorIcon />
            <h2
              id="audit-modal-title"
              className="mt-6 text-lg font-semibold text-zinc-900"
            >
              Audit failed
            </h2>
            <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
              {error ?? "Something went wrong. Please try again."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const SHAPES = [
  { className: "audit-orbit-a", offset: "top", shape: "square", color: "bg-indigo-500" },
  { className: "audit-orbit-b", offset: "right", shape: "circle", color: "bg-violet-500" },
  { className: "audit-orbit-c", offset: "bottom", shape: "diamond", color: "bg-fuchsia-500" },
  { className: "audit-orbit-d", offset: "left", shape: "triangle", color: "bg-sky-500" },
  { className: "audit-orbit-e", offset: "top-right", shape: "hex", color: "bg-amber-400" },
] as const;

function AgentShapeField() {
  return (
    <div
      className="relative mx-auto flex h-40 w-full items-center justify-center"
      aria-hidden
    >
      <div className="absolute inset-x-6 top-3 bottom-3 rounded-2xl bg-gradient-to-b from-indigo-50 to-violet-50/40" />
      <div className="audit-shape-glow relative h-32 w-32">
        {SHAPES.map((item) => (
          <div
            key={item.className}
            className={`audit-orbit absolute inset-0 ${item.className}`}
          >
            <div className={`audit-orbit-anchor audit-orbit-anchor-${item.offset}`}>
              <div className={`audit-shape-bob audit-shape-${item.shape} ${item.color}`} />
            </div>
          </div>
        ))}
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/80 shadow-[0_0_20px_rgba(99,102,241,0.6)]" />
      </div>
    </div>
  );
}

function SuccessIcon() {
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
      <svg
        className="h-8 w-8 text-emerald-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path className="audit-check-draw" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
      <svg
        className="h-8 w-8 text-red-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    </div>
  );
}

function SeverityPill({
  severity,
  count,
}: {
  severity: "red" | "yellow" | "green";
  count: number;
}) {
  const styles = {
    red: "bg-red-50 text-red-700 border-red-100",
    yellow: "bg-amber-50 text-amber-700 border-amber-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  const labels = { red: "Critical", yellow: "Moderate", green: "Strengths" };

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${styles[severity]}`}
    >
      <p className="text-lg font-semibold leading-none">{count}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-70">
        {labels[severity]}
      </p>
    </div>
  );
}
