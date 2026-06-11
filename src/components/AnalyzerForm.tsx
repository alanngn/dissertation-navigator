"use client";

import { useMemo, useState } from "react";
import { useInstructionPresets } from "@/hooks/useInstructionPresets";
import { DEFAULT_MODEL, MODELS } from "@/lib/models";
import { parseApiResponse } from "@/lib/parse-api-response";
import { formatUsd, type UsageCost } from "@/lib/pricing";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

type AnalyzeResponse = {
  output: string;
  documentChars: number;
  usage: UsageCost;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnalyzerForm() {
  const {
    ready,
    switchingUser,
    sessionUserId,
    selectedUserId,
    isViewingSessionUser,
    canEditPresets,
    usingDatabase,
    syncError,
    users,
    selectUser,
    presets,
    activeId,
    activePreset,
    isDraft,
    isDirty,
    instructions,
    presetName,
    updateInstructions,
    updatePresetName,
    commitPresetName,
    selectPreset,
    startNewDraft,
    savePreset,
    deleteActivePreset,
  } = useInstructionPresets();

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState("");
  const [usage, setUsage] = useState<UsageCost | null>(null);
  const [documentChars, setDocumentChars] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => MODELS.find((item) => item.id === model),
    [model],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";

    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setError(
        "File exceeds 4 MB. Vercel limits request size to ~4.5 MB in production.",
      );
      return;
    }

    setFile(selected);
    setError(null);
    setOutput("");
    setUsage(null);
    setDocumentChars(null);
  }

  function handleSelectPreset(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    setPresetMessage(null);

    if (value === "__draft__") {
      const result = startNewDraft();
      if ("error" in result && result.error) {
        setPresetMessage(result.error);
      }
      return;
    }

    selectPreset(value);
  }

  function handleNewPreset() {
    setPresetMessage(null);
    const result = startNewDraft();
    if ("error" in result && result.error) {
      setPresetMessage(result.error);
    }
  }

  function handlePresetNameBlur() {
    if (isDraft) return;

    const result = commitPresetName();
    if ("error" in result && result.error) {
      setPresetMessage(result.error);
    }
  }

  function handlePresetNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  function handleSavePreset() {
    setPresetMessage(null);
    const result = savePreset();

    if ("error" in result && result.error) {
      setPresetMessage(result.error);
      return;
    }

    setPresetMessage("Preset saved.");
  }

  function handleSelectUser(event: React.ChangeEvent<HTMLSelectElement>) {
    setPresetMessage(null);
    void selectUser(event.target.value);
  }

  function handleDeletePreset() {
    setPresetMessage(null);

    if (
      !activePreset ||
      !window.confirm(`Delete "${activePreset.name}"? This cannot be undone.`)
    ) {
      return;
    }

    const result = deleteActivePreset();

    if ("error" in result && result.error) {
      setPresetMessage(result.error);
      return;
    }

    setPresetMessage("Preset deleted.");
  }

  async function handleAnalyze(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Select a document before running analysis.");
      return;
    }

    setAnalyzing(true);
    setOutput("");
    setUsage(null);
    setDocumentChars(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("instructions", instructions);
      formData.append("model", model);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await parseApiResponse<
        AnalyzeResponse & { error?: string }
      >(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed.");
      }

      setOutput(data.output);
      setUsage(data.usage);
      setDocumentChars(data.documentChars);
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Analysis failed.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const selectValue = isDraft ? "__draft__" : (activeId ?? "");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
              Validation Agent Test Harness
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Document analysis playground
            </h1>
            <p className="max-w-2xl text-zinc-600">
              Select a document, define validation instructions, pick a model,
              and inspect the agent output along with token usage and estimated
              cost.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 pt-1">
            {ready && (
              <span
                className={
                  usingDatabase
                    ? "text-[11px] text-emerald-600"
                    : "text-[11px] text-amber-700"
                }
              >
                {usingDatabase ? "Synced to database" : "Local only"}
              </span>
            )}
            {syncError && (
              <span
                className="max-w-[11rem] truncate text-[11px] text-red-600"
                title={syncError}
              >
                {syncError}
              </span>
            )}
            <label htmlFor="user-select" className="sr-only">
              Switch user
            </label>
            <select
              id="user-select"
              value={selectedUserId ?? ""}
              onChange={handleSelectUser}
              disabled={!ready || switchingUser || analyzing}
              className="max-w-[11rem] truncate rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600 outline-none ring-indigo-500 transition hover:border-zinc-300 focus:border-indigo-400 focus:ring-1 disabled:opacity-50"
              title="Switch whose instruction presets are loaded"
            >
              {!ready && <option value="">Loading...</option>}
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.id === sessionUserId ? `${user.name} (you)` : user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <form onSubmit={handleAnalyze} className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="space-y-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-900">
                Instruction preset
              </h3>
              <div className="flex items-center gap-2">
                {!isViewingSessionUser && ready && (
                  <span className="text-xs text-zinc-500">Read-only view</span>
                )}
                {switchingUser && (
                  <span className="text-xs text-zinc-500">Loading user...</span>
                )}
                {isDirty && (
                  <span className="text-xs font-medium text-amber-700">
                    Unsaved instruction changes
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-indigo-200 bg-white p-3">
              <label
                htmlFor="preset-name"
                className="flex items-center gap-2 text-sm font-semibold text-indigo-900"
              >
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-base"
                >
                  ✎
                </span>
                Edit name
              </label>
              <input
                id="preset-name"
                type="text"
                value={presetName}
                onChange={(event) => updatePresetName(event.target.value)}
                onBlur={handlePresetNameBlur}
                onKeyDown={handlePresetNameKeyDown}
                disabled={analyzing || switchingUser || !canEditPresets}
                placeholder={
                  isDraft
                    ? "Enter a name for this preset"
                    : "Change the preset name here"
                }
                className="w-full rounded-lg border-2 border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none ring-indigo-500 placeholder:font-normal placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 disabled:bg-zinc-100"
              />
              <p className="text-xs leading-5 text-zinc-600">
                {isDraft
                  ? "Required before you save a new preset."
                  : "Renames save automatically when you click away or press Enter."}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="preset-select"
                className="text-sm font-medium text-zinc-900"
              >
                Switch preset
              </label>
              <select
                id="preset-select"
                value={ready ? selectValue : ""}
                onChange={handleSelectPreset}
                disabled={!ready || analyzing || switchingUser}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2 disabled:bg-zinc-100"
              >
                {!ready && <option value="">Loading presets...</option>}
                {ready && switchingUser && (
                  <option value="">Loading presets...</option>
                )}
                {ready && isDraft && (
                  <option value="__draft__">New draft (unsaved)</option>
                )}
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
                {ready && !isDraft && (
                  <option value="__draft__">+ New draft...</option>
                )}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleNewPreset}
                disabled={analyzing || switchingUser || !canEditPresets}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                New
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={
                  analyzing ||
                  switchingUser ||
                  !canEditPresets ||
                  !instructions.trim()
                }
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
              >
                {isDraft ? "Save as new" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleDeletePreset}
                disabled={analyzing || switchingUser || !canEditPresets || isDraft}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>

            {presetMessage && (
              <p className="text-xs text-zinc-600">{presetMessage}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="instructions"
              className="text-sm font-medium text-zinc-900"
            >
              Instructions
            </label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(event) => updateInstructions(event.target.value)}
              rows={12}
              disabled={switchingUser}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm leading-6 text-zinc-900 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2 disabled:bg-zinc-100"
              placeholder="Describe how the agent should validate or analyze the document..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="model" className="text-sm font-medium text-zinc-900">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2"
            >
              {MODELS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {selectedModel && (
              <p className="text-xs text-zinc-500">
                ${selectedModel.pricing.inputPer1M}/1M input · $
                {selectedModel.pricing.outputPer1M}/1M output ·{" "}
                {(selectedModel.contextLength / 1_000_000).toFixed(2)}M context
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="document" className="text-sm font-medium text-zinc-900">
              Document
            </label>
            <label
              htmlFor="document"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
            >
              <span className="text-sm font-medium text-zinc-900">
                {file ? file.name : "Click to select a document"}
              </span>
              <span className="mt-1 text-xs text-zinc-500">
                PDF, TXT, MD, CSV, JSON up to 4 MB
              </span>
              <input
                id="document"
                type="file"
                accept=".pdf,.txt,.md,.markdown,.csv,.json,.xml,.html,.htm,text/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={analyzing}
              />
            </label>
            {file && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-emerald-700">
                  {formatBytes(file.size)} · sent directly on analyze
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={analyzing || !file}
            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {analyzing ? "Running analysis..." : "Run analysis"}
          </button>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-medium text-zinc-900">Output</h2>
              {documentChars !== null && (
                <span className="text-xs text-zinc-500">
                  {documentChars.toLocaleString()} document chars parsed
                </span>
              )}
            </div>
            <div className="min-h-[420px] whitespace-pre-wrap rounded-xl bg-zinc-950 px-4 py-4 font-mono text-sm leading-6 text-zinc-100">
              {output || "Analysis output will appear here."}
            </div>
          </div>

          {usage && (
            <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:grid-cols-2">
              <Metric label="Prompt tokens" value={usage.promptTokens.toLocaleString()} />
              <Metric
                label="Completion tokens"
                value={usage.completionTokens.toLocaleString()}
              />
              <Metric label="Total tokens" value={usage.totalTokens.toLocaleString()} />
              <Metric label="Estimated cost" value={formatUsd(usage.totalCost)} />
              <Metric label="Input cost" value={formatUsd(usage.inputCost)} />
              <Metric label="Output cost" value={formatUsd(usage.outputCost)} />
            </div>
          )}
        </section>
      </form>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
