"use client";

import { useMemo, useState } from "react";
import { DEFAULT_MODEL, MODELS } from "@/lib/models";
import { formatUsd, type UsageCost } from "@/lib/pricing";

type AnalyzeResponse = {
  output: string;
  documentChars: number;
  usage: UsageCost;
};

const DEFAULT_INSTRUCTIONS = `Analyze the uploaded document and return:
1. A brief summary
2. Key claims or findings
3. Potential validation issues or gaps
4. A pass/fail recommendation with rationale`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnalyzerForm() {
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState("");
  const [usage, setUsage] = useState<UsageCost | null>(null);
  const [documentChars, setDocumentChars] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => MODELS.find((item) => item.id === model),
    [model],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";

    if (!selected) return;

    setFile(selected);
    setError(null);
    setOutput("");
    setUsage(null);
    setDocumentChars(null);
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

      const data = (await response.json()) as AnalyzeResponse & {
        error?: string;
      };

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
          Validation Agent Test Harness
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Document analysis playground
        </h1>
        <p className="max-w-2xl text-zinc-600">
          Select a document, define validation instructions, pick a model, and
          inspect the agent output along with token usage and estimated cost.
        </p>
      </header>

      <form onSubmit={handleAnalyze} className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
              onChange={(event) => setInstructions(event.target.value)}
              rows={12}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm leading-6 text-zinc-900 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2"
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
                PDF, TXT, MD, CSV, JSON up to 10 MB
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
