"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuditRunModal } from "@/components/audit/AuditRunModal";
import { usePresets } from "@/components/providers/PresetsProvider";
import { FileUpload } from "@/components/ui/FileUpload";
import { BoltIcon, ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type AuditReport } from "@/lib/audit-types";
import { agentColorClass, agentInitial } from "@/lib/agent-display";
import { presetDescription } from "@/lib/format";
import { DEFAULT_MODEL } from "@/lib/models";
import { parseApiResponse } from "@/lib/parse-api-response";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

type AuditRunApiResponse = {
  report: AuditReport;
  error?: string;
};

type ModalStatus = "running" | "success" | "error";

export function DashboardPage() {
  const router = useRouter();
  const { ready, presets, canEditPresets, startNewDraft, sessionUserId } =
    usePresets();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>("running");
  const [modalError, setModalError] = useState<string | null>(null);
  const [completedReport, setCompletedReport] = useState<AuditReport | null>(
    null,
  );

  function handleFileChange(selected: File | null) {
    setFileError(null);
    setModalError(null);

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError(
        "File exceeds 4 MB. Vercel limits request size to ~4.5 MB in production.",
      );
      return;
    }

    setFile(selected);
  }

  function handleAddAgent() {
    if (!canEditPresets) return;
    const result = startNewDraft();
    if (!("error" in result)) {
      router.push("/agents/new");
    }
  }

  function handleCloseModal() {
    setModalOpen(false);
    setModalStatus("running");
    setModalError(null);
    setCompletedReport(null);
  }

  async function handleRunAudit() {
    if (!file) {
      setModalError("Upload a dissertation before running an audit.");
      return;
    }

    if (presets.length === 0) {
      setModalError("Add at least one agent before running an audit.");
      return;
    }

    setModalOpen(true);
    setModalStatus("running");
    setModalError(null);
    setCompletedReport(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", DEFAULT_MODEL);
      formData.append(
        "agents",
        JSON.stringify(
          presets.map((preset) => ({
            id: preset.id,
            name: preset.name,
            instructions: preset.content,
          })),
        ),
      );
      if (sessionUserId) {
        formData.append("userId", sessionUserId);
      }

      const response = await fetch("/api/audits/run", {
        method: "POST",
        body: formData,
      });

      const data = await parseApiResponse<AuditRunApiResponse & { error?: string }>(
        response,
      );

      if (!response.ok) {
        throw new Error(data.error ?? `Audit failed (HTTP ${response.status}).`);
      }

      setCompletedReport(data.report);
      setModalStatus("success");
    } catch (error) {
      setModalStatus("error");
      setModalError(
        error instanceof Error ? error.message : "Audit failed.",
      );
    }
  }

  const auditing = modalOpen && modalStatus === "running";
  const canRun = Boolean(file) && presets.length > 0 && !auditing;

  return (
    <>
      <div className="mx-auto max-w-5xl px-8 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Run validation agents on a dissertation and generate an audit report.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">
                1. Configure Agents
              </h2>
              <Link
                href="/agents"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Manage Agents
              </Link>
            </div>

            <div className="flex-1 divide-y divide-zinc-100">
              {!ready && (
                <p className="px-5 py-8 text-center text-sm text-zinc-400">
                  Loading agents…
                </p>
              )}
              {ready &&
                presets.map((preset, index) => (
                  <Link
                    key={preset.id}
                    href={`/agents/${preset.id}`}
                    className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 px-5 py-3.5 transition hover:bg-zinc-50"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${agentColorClass(index)}`}
                    >
                      {agentInitial(preset.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {preset.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {presetDescription(preset.purpose || preset.content, 60)}
                      </p>
                    </div>

                    <StatusBadge label="Active" />

                    <ChevronRightIcon className="shrink-0 text-zinc-300 transition group-hover:text-zinc-500" />
                  </Link>
                ))}
            </div>

            {canEditPresets && (
              <div className="border-t border-zinc-100 p-4">
                <button
                  type="button"
                  onClick={handleAddAgent}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
                >
                  <PlusIcon />
                  Add Agent
                </button>
              </div>
            )}
          </section>

          <section className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">
                2. Upload & Run Audit
              </h2>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <FileUpload
                file={file}
                onFileChange={handleFileChange}
                disabled={auditing}
              />

              {fileError && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {fileError}
                </p>
              )}

              <div className="mt-5 flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <BoltIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {auditing ? "Audit in progress…" : "Ready to run audit"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {auditing
                      ? `${presets.length} agents analyzing your document`
                      : "All agents will run in parallel"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleRunAudit()}
                disabled={!canRun}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {auditing ? "Running Audit…" : "Run Audit"}
              </button>

              {modalError && !modalOpen && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {modalError}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <AuditRunModal
        open={modalOpen}
        agentNames={presets.map((preset) => preset.name)}
        fileName={file?.name ?? null}
        status={modalStatus}
        report={completedReport}
        error={modalError}
        onClose={handleCloseModal}
      />
    </>
  );
}
