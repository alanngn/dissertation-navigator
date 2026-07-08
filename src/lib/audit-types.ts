export type FindingSeverity = "red" | "yellow" | "green";

export type AgentFinding = {
  id?: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  /** Concrete, generalized writing excerpt illustrating good practice — only for recommendations (red/yellow). */
  example?: string;
};

export type AttributedFinding = AgentFinding & {
  agentId: string;
  agentName: string;
  agentResultId?: string;
};

export type StructuredAgentOutput = {
  summary: string;
  findings: AgentFinding[];
};

export type AgentAuditResult = {
  id?: string;
  agentId: string;
  agentName: string;
  status: "completed" | "failed";
  summary: string;
  findings: AgentFinding[];
  rawOutput: string;
  error?: string;
};

export type AuditReport = {
  id: string;
  slug: string;
  fileName: string;
  completedAt: number;
  agentsRun: number;
  agentsFailed: number;
  agentResults: AgentAuditResult[];
  totals: Record<FindingSeverity, number>;
};

export type AuditSummary = {
  id: string;
  slug: string;
  fileName: string;
  completedAt: number;
  agentsRun: number;
  agentsFailed: number;
  totals: Record<FindingSeverity, number>;
};

export const MAX_AGENT_OUTPUT_SENTENCES = 2;
export const MAX_EXAMPLE_SENTENCES = 4;

export function truncateToMaxSentences(
  text: string,
  maxSentences = MAX_AGENT_OUTPUT_SENTENCES,
): string {
  const trimmed = text.trim();
  if (!trimmed || maxSentences < 1) return trimmed;

  const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  if (!sentences || sentences.length <= maxSentences) return trimmed;

  return sentences.slice(0, maxSentences).join("").trim();
}

export const STRUCTURED_OUTPUT_SYSTEM_APPENDIX = `

You MUST respond with ONLY valid JSON (no markdown fences, no extra text) matching this exact schema:
{
  "summary": "Overall assessment for this agent's domain (max 2 sentences)",
  "findings": [
    {
      "severity": "red" | "yellow" | "green",
      "title": "Short label (a few words)",
      "detail": "Brief explanation with key evidence (max 2 sentences)",
      "example": "Optional. Required for red and yellow findings — see below."
    }
  ]
}

Conciseness (required):
- Keep every summary and finding detail to at most 2 sentences. No exceptions.
- Lead with the conclusion; cite only the most relevant evidence.
- Prefer fewer findings over verbose ones. Omit low-value observations.

Severity definitions:
- "red": Critical issues or recommendations that must be addressed
- "yellow": Moderate recommendations for improvement
- "green": Strengths, well-done elements, or positive observations

Recommendations (red and yellow) must include an "example" field:
- Write a concrete, generalized writing excerpt — actual dissertation-style prose the student could emulate — not abstract advice about what to study or do next.
- Do NOT write or rewrite the student's dissertation content. Use a placeholder topic (e.g. "a study of teacher retention") rather than their specific subject matter.
- The excerpt should demonstrate structure, tone, and specificity for the type of issue flagged (max 4 sentences).
- Omit "example" (or set to null) for green findings.

Example format (bad vs good):
- Bad (too abstract): "For a study of teacher retention, the student should strengthen alignment between the conceptual framework and research questions and review case study design guidance."
- Good (concrete excerpt): "The conceptual framework for this study of teacher retention draws on retention theory (Author, Year), which links organizational support and professional growth to educators' decisions to remain in the field. This framework directly informs the central research question: What factors influence early-career teachers' decisions to stay in their district? Each sub-question maps to a construct within the framework and will be operationalized through document analysis of district retention reports."`;

function normalizeSeverity(value: unknown): FindingSeverity | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  if (lower === "red" || lower === "critical") return "red";
  if (lower === "yellow" || lower === "moderate" || lower === "amber") {
    return "yellow";
  }
  if (lower === "green" || lower === "good" || lower === "positive") {
    return "green";
  }
  return null;
}

function normalizeFinding(raw: unknown): AgentFinding | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const severity = normalizeSeverity(item.severity);
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const detail =
    typeof item.detail === "string"
      ? item.detail.trim()
      : typeof item.description === "string"
        ? item.description.trim()
        : "";

  if (!severity || !title) return null;

  const rawExample =
    typeof item.example === "string"
      ? item.example.trim()
      : typeof item.sample === "string"
        ? item.sample.trim()
        : "";

  const finding: AgentFinding = {
    severity,
    title,
    detail: truncateToMaxSentences(detail || title),
  };

  if (rawExample && (severity === "red" || severity === "yellow")) {
    finding.example = truncateToMaxSentences(
      rawExample,
      MAX_EXAMPLE_SENTENCES,
    );
  }

  return finding;
}

export function parseStructuredAgentOutput(raw: string): StructuredAgentOutput {
  const trimmed = raw.trim();

  const candidates = [trimmed];
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) candidates.unshift(fenceMatch[1].trim());

  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch?.[0]) candidates.push(braceMatch[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const summary =
        typeof parsed.summary === "string" ? parsed.summary.trim() : "";
      const findingsRaw = Array.isArray(parsed.findings) ? parsed.findings : [];
      const findings = findingsRaw
        .map(normalizeFinding)
        .filter((f): f is AgentFinding => f !== null);

      if (findings.length > 0) {
        return {
          summary: truncateToMaxSentences(summary || "Analysis complete."),
          findings,
        };
      }
    } catch {
      // try next candidate
    }
  }

  return {
    summary: "Could not parse structured output.",
    findings: [
      {
        severity: "yellow",
        title: "Unstructured response",
        detail: trimmed.slice(0, 2000) || "No output returned.",
      },
    ],
  };
}

export function countFindings(findings: AgentFinding[]): Record<FindingSeverity, number> {
  return findings.reduce(
    (acc, f) => {
      acc[f.severity] += 1;
      return acc;
    },
    { red: 0, yellow: 0, green: 0 },
  );
}

export function mergeTotals(
  results: AgentAuditResult[],
): Record<FindingSeverity, number> {
  return results.reduce(
    (acc, result) => {
      if (result.status !== "completed") return acc;
      const counts = countFindings(result.findings);
      acc.red += counts.red;
      acc.yellow += counts.yellow;
      acc.green += counts.green;
      return acc;
    },
    { red: 0, yellow: 0, green: 0 },
  );
}

export function agentWorstSeverity(
  findings: AgentFinding[],
): FindingSeverity | "none" {
  if (findings.some((f) => f.severity === "red")) return "red";
  if (findings.some((f) => f.severity === "yellow")) return "yellow";
  if (findings.some((f) => f.severity === "green")) return "green";
  return "none";
}

import { createAuditSlug } from "@/lib/audit-slug";

export function createAuditReport(
  fileName: string,
  agentResults: AgentAuditResult[],
): AuditReport {
  const agentsFailed = agentResults.filter((r) => r.status === "failed").length;
  return {
    id: crypto.randomUUID(),
    slug: createAuditSlug(),
    fileName,
    completedAt: Date.now(),
    agentsRun: agentResults.length,
    agentsFailed,
    agentResults,
    totals: mergeTotals(agentResults),
  };
}

export function aggregateFindings(
  results: AgentAuditResult[],
): AttributedFinding[] {
  return results.flatMap((result) =>
    result.status === "completed"
      ? result.findings.map((finding) => ({
          ...finding,
          agentId: result.agentId,
          agentName: result.agentName,
          agentResultId: result.id,
        }))
      : [],
  );
}

export function isFindingSeverity(value: unknown): value is FindingSeverity {
  return value === "red" || value === "yellow" || value === "green";
}

export function normalizeFindingInput(input: {
  severity: unknown;
  title: unknown;
  detail: unknown;
  example?: unknown;
}): AgentFinding | null {
  if (!isFindingSeverity(input.severity)) return null;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const detail = typeof input.detail === "string" ? input.detail.trim() : "";
  const rawExample =
    typeof input.example === "string" ? input.example.trim() : "";
  if (!title) return null;

  const finding: AgentFinding = {
    severity: input.severity,
    title,
    detail: detail || title,
  };

  if (
    rawExample &&
    (input.severity === "red" || input.severity === "yellow")
  ) {
    finding.example = rawExample;
  }

  return finding;
}

export function totalFindingCount(
  report: Pick<AuditReport, "totals">,
): number {
  return report.totals.red + report.totals.yellow + report.totals.green;
}
