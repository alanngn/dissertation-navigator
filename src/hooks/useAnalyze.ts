"use client";

import { useState } from "react";
import type { AgentFinding } from "@/lib/audit-types";
import { parseApiResponse } from "@/lib/parse-api-response";
import { formatUsd, type UsageCost } from "@/lib/pricing";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export type AnalyzeResult = {
  output: string;
  summary: string;
  findings: AgentFinding[];
  documentChars: number;
  usage: UsageCost;
};

export function useAnalyze() {
  const [output, setOutput] = useState("");
  const [summary, setSummary] = useState("");
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [usage, setUsage] = useState<UsageCost | null>(null);
  const [documentChars, setDocumentChars] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis(
    file: File,
    instructions: string,
    model: string,
  ): Promise<boolean> {
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "File exceeds 4 MB. Vercel limits request size to ~4.5 MB in production.",
      );
      return false;
    }

    setAnalyzing(true);
    setOutput("");
    setSummary("");
    setFindings([]);
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
        AnalyzeResult & { error?: string }
      >(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed.");
      }

      setOutput(data.output);
      setSummary(data.summary ?? "");
      setFindings(Array.isArray(data.findings) ? data.findings : []);
      setUsage(data.usage);
      setDocumentChars(data.documentChars);
      return true;
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Analysis failed.",
      );
      return false;
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setOutput("");
    setSummary("");
    setFindings([]);
    setUsage(null);
    setDocumentChars(null);
    setError(null);
  }

  return {
    output,
    summary,
    findings,
    usage,
    documentChars,
    analyzing,
    error,
    runAnalysis,
    reset,
    formatUsd,
  };
}
