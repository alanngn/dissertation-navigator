"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePresets } from "@/components/providers/PresetsProvider";
import { FileUpload } from "@/components/ui/FileUpload";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { FindingsList } from "@/components/audit/FindingsList";
import { useAnalyze } from "@/hooks/useAnalyze";
import { DEFAULT_MODEL, MODELS } from "@/lib/models";

const MAX_PURPOSE = 2000;
const MAX_BUSINESS_FUNCTION = 2000;
const MAX_RULE = 500;

type AgentEditorPageProps = {
  agentId: string | "new";
};

export function AgentEditorPage({ agentId }: AgentEditorPageProps) {
  const router = useRouter();
  const isNew = agentId === "new";

  const {
    ready,
    presets,
    canEditPresets,
    instructions,
    purpose,
    businessFunction,
    rules,
    presetName,
    updatePurpose,
    updateBusinessFunction,
    addRule,
    updateRule,
    removeRule,
    updatePresetName,
    commitPresetName,
    loadPresetForEditing,
    startNewDraft,
    savePreset,
    deletePresetById,
  } = usePresets();

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    output,
    summary,
    findings,
    usage,
    documentChars,
    analyzing,
    error: analyzeError,
    runAnalysis,
    formatUsd,
  } = useAnalyze();

  const existingPreset = useMemo(
    () => (isNew ? null : presets.find((p) => p.id === agentId)),
    [agentId, isNew, presets],
  );

  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (initializedFor.current === agentId) return;

    if (isNew) {
      startNewDraft();
      initializedFor.current = agentId;
      return;
    }

    if (!existingPreset) {
      router.replace("/agents");
      return;
    }

    loadPresetForEditing(agentId);
    initializedFor.current = agentId;
  }, [
    ready,
    isNew,
    agentId,
    existingPreset,
    loadPresetForEditing,
    router,
    startNewDraft,
  ]);

  function handleFileChange(selected: File | null) {
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > 4 * 1024 * 1024) {
      setFile(null);
      setFileError("File exceeds 4 MB.");
      return;
    }
    setFile(selected);
  }

  function handleSave() {
    setMessage(null);
    const result = savePreset();
    if ("error" in result && result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Changes saved.");
    if (isNew && "id" in result && result.id) {
      router.replace(`/agents/${result.id}`);
    }
  }

  function handleDelete() {
    if (isNew) {
      router.push("/agents");
      return;
    }

    if (!window.confirm(`Delete "${presetName}"? This cannot be undone.`)) return;

    const result = deletePresetById(agentId);
    if ("error" in result && result.error) {
      setMessage(result.error);
      return;
    }
    router.push("/agents");
  }

  async function handleTest() {
    if (!file) {
      setFileError("Upload a document to test this agent.");
      return;
    }
    if (!instructions.trim()) {
      setMessage("Add a purpose, business function, or rule before testing.");
      return;
    }
    await runAnalysis(file, instructions, model);
  }

  const selectedModel = MODELS.find((m) => m.id === model);
  const readOnly = !canEditPresets;

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!isNew && !existingPreset) {
    return null;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeftIcon />
          Back to Agents
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/agents"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </Link>
          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!instructions.trim() || !presetName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto border-r border-zinc-200 bg-white px-8 py-6">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-xl font-semibold text-zinc-900">
              {isNew ? "New Agent" : "Edit Agent"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Define the purpose, business function, and rules used to build this
              agent&apos;s audit prompt.
            </p>

            {readOnly && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                Read-only view — switch to your session to edit agents.
              </p>
            )}

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="agent-name" className="text-sm font-medium text-zinc-900">
                  Agent Name
                </label>
                <input
                  id="agent-name"
                  type="text"
                  value={presetName}
                  onChange={(e) => updatePresetName(e.target.value)}
                  onBlur={() => !isNew && commitPresetName()}
                  disabled={readOnly}
                  placeholder="e.g. Alignment Agent"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2 disabled:bg-zinc-50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="purpose" className="text-sm font-medium text-zinc-900">
                    Purpose
                  </label>
                  <span className="text-xs text-zinc-400">
                    {purpose.length} / {MAX_PURPOSE}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  What this agent is for and where it fits in the dissertation
                  process.
                </p>
                <textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) =>
                    updatePurpose(e.target.value.slice(0, MAX_PURPOSE))
                  }
                  rows={5}
                  disabled={readOnly}
                  placeholder="The Topic and Title Development Agent serves as the dissertation entry point…"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm leading-6 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2 disabled:bg-zinc-50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="business-function"
                    className="text-sm font-medium text-zinc-900"
                  >
                    Business Function
                  </label>
                  <span className="text-xs text-zinc-400">
                    {businessFunction.length} / {MAX_BUSINESS_FUNCTION}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  What the agent evaluates and the risks it helps students avoid.
                </p>
                <textarea
                  id="business-function"
                  value={businessFunction}
                  onChange={(e) =>
                    updateBusinessFunction(
                      e.target.value.slice(0, MAX_BUSINESS_FUNCTION),
                    )
                  }
                  rows={5}
                  disabled={readOnly}
                  placeholder="The agent evaluates dissertation titles for scholarly quality, clarity…"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm leading-6 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2 disabled:bg-zinc-50"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-900">
                    Rules
                  </label>
                  <span className="text-xs text-zinc-400">
                    {rules.length} rule{rules.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Add, edit, or remove the individual rules this agent enforces.
                  Each rule is numbered automatically in the prompt.
                </p>

                {rules.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400">
                    No rules yet. Add the first rule below.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {rules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-2.5 shrink-0 text-xs font-medium text-zinc-400">
                          Rule {index + 1}
                        </span>
                        <textarea
                          value={rule}
                          onChange={(e) =>
                            updateRule(index, e.target.value.slice(0, MAX_RULE))
                          }
                          rows={2}
                          disabled={readOnly}
                          placeholder="The title must be concise, scholarly, and professional."
                          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2 disabled:bg-zinc-50"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeRule(index)}
                            title="Remove rule"
                            className="mt-1 shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {!readOnly && (
                  <button
                    type="button"
                    onClick={addRule}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
                  >
                    <PlusIcon />
                    Add Rule
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-900"
                >
                  Advanced Settings
                  <span className="text-zinc-400">{showAdvanced ? "−" : "+"}</span>
                </button>
                {showAdvanced && (
                  <div className="space-y-4 border-t border-zinc-100 px-4 py-4">
                    <div className="space-y-2">
                      <label htmlFor="model" className="text-sm font-medium text-zinc-700">
                        Model
                      </label>
                      <select
                        id="model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2"
                      >
                        {MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      {selectedModel && (
                        <p className="text-xs text-zinc-500">
                          ${selectedModel.pricing.inputPer1M}/1M input · $
                          {selectedModel.pricing.outputPer1M}/1M output
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {message && (
                <p className="text-sm text-zinc-600">{message}</p>
              )}

              {!readOnly && !isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  <TrashIcon />
                  Delete Agent
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Test panel */}
        <div className="flex w-[420px] shrink-0 flex-col overflow-y-auto bg-zinc-50 px-6 py-6">
          <h2 className="text-sm font-semibold text-zinc-900">Test Agent</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Upload a document and run this agent to preview its output.
          </p>

          <div className="mt-4">
            <FileUpload
              file={file}
              onFileChange={handleFileChange}
              disabled={analyzing}
              maxSizeLabel="PDF, DOCX, TXT (Max 4 MB)"
            />
          </div>

          {fileError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {fileError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={analyzing || !file || !instructions.trim()}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {analyzing ? "Running test…" : "Run Test"}
          </button>

          {analyzeError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {analyzeError}
            </p>
          )}

          <div className="mt-6 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Results
              </h3>
              {documentChars !== null && (
                <span className="text-xs text-zinc-400">
                  {documentChars.toLocaleString()} chars parsed
                </span>
              )}
            </div>

            {findings.length > 0 ? (
              <div className="space-y-3">
                {summary && (
                  <p className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                    {summary}
                  </p>
                )}
                <FindingsList findings={findings} />
              </div>
            ) : (
              <div className="min-h-[200px] whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-950 px-4 py-4 font-mono text-xs leading-5 text-zinc-100">
                {output || "Test output will appear here."}
              </div>
            )}

            {usage && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric label="Tokens" value={usage.totalTokens.toLocaleString()} />
                <Metric label="Cost" value={formatUsd(usage.totalCost)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
