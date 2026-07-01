import OpenAI from "openai";
import type { AgentAuditResult } from "@/lib/audit-types";

export function formatAnalysisError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      return "OpenAI API quota exceeded. Check your plan and billing at platform.openai.com.";
    }
    if (error.status === 401) {
      return "Invalid OpenAI API key. Check OPENAI_API_KEY in your environment.";
    }
    if (error.status === 404) {
      return `Model not available: ${error.message}`;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Analysis failed.";
}

export function summarizeAuditFailures(
  agentResults: AgentAuditResult[],
): string {
  const failures = agentResults.filter((result) => result.status === "failed");

  if (failures.length === 0) {
    return "All agents failed. Check your configuration and try again.";
  }

  const uniqueErrors = [
    ...new Set(
      failures
        .map((result) => result.error?.trim())
        .filter((message): message is string => Boolean(message)),
    ),
  ];

  if (uniqueErrors.length === 1) {
    return uniqueErrors[0]!;
  }

  if (uniqueErrors.length > 1) {
    return uniqueErrors.map((message) => `• ${message}`).join("\n");
  }

  const namedFailures = failures
    .map((result) => `${result.agentName}: analysis failed`)
    .join(", ");

  return `All agents failed (${namedFailures}).`;
}
