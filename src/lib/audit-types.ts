import { createAuditSlug } from "@/lib/audit-slug";

export type FindingSeverity = "red" | "yellow" | "green";

export type AgentFinding = {
  id?: string;
  severity: FindingSeverity;
  /** Short scan label (3–5 words). */
  title: string;
  /** Legacy fallback for green strengths and pre-migration audits. */
  detail: string;
  /** One-sentence issue statement (red/yellow coaching format). */
  issue?: string;
  /** One-sentence rationale (red/yellow coaching format). */
  whyItMatters?: string;
  /** One-sentence corrective action (red/yellow coaching format). */
  howToFix?: string;
  /** One-sentence actionable tip (red/yellow coaching format). */
  navigatorTip?: string;
  /** Illustrative pattern showing what good practice looks like — recommendations only. */
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
  projectId: string;
  projectName: string;
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
  projectId: string;
  projectName: string;
  fileName: string;
  completedAt: number;
  agentsRun: number;
  agentsFailed: number;
  totals: Record<FindingSeverity, number>;
};

export type Project = {
  id: string;
  name: string;
  userId?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ProjectSummary = {
  id: string;
  name: string;
  auditCount: number;
  latestAudit: AuditSummary | null;
};

export type ProjectDetail = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  audits: AuditSummary[];
};

export const MAX_AGENT_OUTPUT_SENTENCES = 2;
export const MAX_COACHING_SENTENCES = 1;
export const MAX_EXAMPLE_SENTENCES = 2;

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

function readOptionalString(
  item: Record<string, unknown>,
  key: string,
): string {
  const value = item[key];
  return typeof value === "string" ? value.trim() : "";
}

export function hasCoachingFormat(finding: AgentFinding): boolean {
  return Boolean(
    finding.issue ||
      finding.whyItMatters ||
      finding.howToFix ||
      finding.navigatorTip,
  );
}

export function composeDetailFromCoaching(finding: AgentFinding): string {
  const parts = [
    finding.issue,
    finding.whyItMatters,
    finding.howToFix,
    finding.navigatorTip,
  ].filter((part): part is string => Boolean(part?.trim()));

  if (parts.length > 0) return parts.join(" ");
  return finding.detail || finding.title;
}

export const STRUCTURED_OUTPUT_SYSTEM_APPENDIX = `

You MUST respond with ONLY valid JSON (no markdown fences, no extra text) matching this exact schema:

For red and yellow findings (coaching format):
{
  "summary": "Overall assessment for this agent's domain (max 2 sentences)",
  "findings": [
    {
      "severity": "red" | "yellow",
      "title": "Short scan label (3–5 words, not a full sentence)",
      "issue": "One sentence stating the issue.",
      "whyItMatters": "One sentence explaining why it matters.",
      "howToFix": "One sentence describing how to fix it.",
      "navigatorTip": "One sentence with a concrete actionable tip.",
      "example": "Required: one illustrative pattern sentence (see EXAMPLE RULES below)."
    }
  ]
}

For green findings (strengths — simpler format):
{
  "findings": [
    {
      "severity": "green",
      "title": "Short scan label (3–5 words)",
      "detail": "One sentence describing the strength (max 2 sentences)."
    }
  ]
}

Coaching format rules (red and yellow — required):
- title: 3–5 words only, scannable (e.g. "Inconsistent framework name", not "Framework naming is inconsistent")
- issue, whyItMatters, howToFix, navigatorTip: exactly one sentence each — no multi-sentence paragraphs
- Prefer fewer findings over verbose ones. Omit low-value observations.

Title examples (short scan labels):
- "Inconsistent framework name" (not "Framework naming is inconsistent")
- "Inconsistent sampling terminology" (not "Sampling language is inconsistent")
- "Problem statement lacks focus" (not "Problem statement is too diffuse")

Coaching section examples (one sentence each):
- issue: "Framework naming is inconsistent."
- whyItMatters: "Using different framework names weakens alignment and may confuse committee members."
- howToFix: "Select one framework name and use it consistently throughout every chapter."
- navigatorTip: "Search the dissertation for both framework names and replace every occurrence with the approved framework name."

Conciseness (required):
- Keep summary to at most 2 sentences.
- Lead with the conclusion; cite only the most relevant evidence.

Severity definitions:
- "red": Critical issues or recommendations that must be addressed
- "yellow": Moderate recommendations for improvement
- "green": Strengths, well-done elements, or positive observations

EXAMPLE RULES (red and yellow findings only):
The "example" field is an illustrative pattern — not content for the student to paste. Write exactly one sentence in this form:

A good [element] would look like "[short snippet on a placeholder topic]."

Rules:
- Replace [element] with the dissertation component under review (title, problem statement, purpose statement, research question, framework reference, etc.).
- The quoted snippet is a brief structural model only — one title line, one sentence, or one research question — on a placeholder topic unrelated to the student's manuscript.
- Do not write multi-paragraph prose, purpose-statement paragraphs, or full section drafts.
- Do not use the student's subject matter, population, or topic.

Good examples (output one sentence like these):
- A good title would look like "Early-Career Teacher Retention in Urban Districts: A Qualitative Case Study."
- A good problem statement opening would look like "Across Midwestern urban districts, early-career teacher turnover exceeded 18% annually since 2019 (Author, Year), yet few studies examine district induction policies."
- A good research question would look like "RQ1: What experiences do first-year teachers describe as influencing their decision to remain in the district?"
- A good framework reference would look like "This study draws on retention theory (Author, Year), which links organizational support to educators' decisions to remain."

Bad (full prose to paste — never output this):
"The purpose of this qualitative case study is to examine how oversight and enforcement mechanisms operate within a federal merit promotion system (Author, Year). The study uses document analysis and interviews to explore institutional accountability in a bounded public-sector setting."

Bad (no illustrative snippet — never output this):
"The student should write a shorter title that avoids redundant design language."

Omit "example" (or set to null) for green findings.`;

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

function normalizeCoachingField(value: string): string | undefined {
  const trimmed = truncateToMaxSentences(value, MAX_COACHING_SENTENCES);
  return trimmed || undefined;
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

  const issue = normalizeCoachingField(readOptionalString(item, "issue"));
  const whyItMatters = normalizeCoachingField(
    readOptionalString(item, "whyItMatters"),
  );
  const howToFix = normalizeCoachingField(readOptionalString(item, "howToFix"));
  const navigatorTip = normalizeCoachingField(
    readOptionalString(item, "navigatorTip"),
  );

  const finding: AgentFinding = {
    severity,
    title,
    detail: "",
  };

  if (severity === "red" || severity === "yellow") {
    if (issue) finding.issue = issue;
    if (whyItMatters) finding.whyItMatters = whyItMatters;
    if (howToFix) finding.howToFix = howToFix;
    if (navigatorTip) finding.navigatorTip = navigatorTip;

    finding.detail = composeDetailFromCoaching({
      ...finding,
      detail: truncateToMaxSentences(detail || issue || title),
    });

    if (rawExample) {
      finding.example = truncateToMaxSentences(
        rawExample,
        MAX_EXAMPLE_SENTENCES,
      );
    }
  } else {
    finding.detail = truncateToMaxSentences(detail || title);
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

export function createAuditReport(
  fileName: string,
  agentResults: AgentAuditResult[],
  project?: { id: string; name: string },
): AuditReport {
  const agentsFailed = agentResults.filter((r) => r.status === "failed").length;
  return {
    id: crypto.randomUUID(),
    slug: createAuditSlug(),
    projectId: project?.id ?? "",
    projectName: project?.name ?? "",
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
  detail?: unknown;
  issue?: unknown;
  whyItMatters?: unknown;
  howToFix?: unknown;
  navigatorTip?: unknown;
  example?: unknown;
}): AgentFinding | null {
  if (!isFindingSeverity(input.severity)) return null;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const detail = typeof input.detail === "string" ? input.detail.trim() : "";
  const issue =
    typeof input.issue === "string" ? input.issue.trim() : undefined;
  const whyItMatters =
    typeof input.whyItMatters === "string"
      ? input.whyItMatters.trim()
      : undefined;
  const howToFix =
    typeof input.howToFix === "string" ? input.howToFix.trim() : undefined;
  const navigatorTip =
    typeof input.navigatorTip === "string"
      ? input.navigatorTip.trim()
      : undefined;
  const rawExample =
    typeof input.example === "string" ? input.example.trim() : "";
  if (!title) return null;

  const finding: AgentFinding = {
    severity: input.severity,
    title,
    detail: "",
  };

  if (input.severity === "red" || input.severity === "yellow") {
    if (issue) finding.issue = issue;
    if (whyItMatters) finding.whyItMatters = whyItMatters;
    if (howToFix) finding.howToFix = howToFix;
    if (navigatorTip) finding.navigatorTip = navigatorTip;
    finding.detail = composeDetailFromCoaching({
      ...finding,
      detail: detail || title,
    });
    if (rawExample) finding.example = rawExample;
  } else {
    finding.detail = detail || title;
  }

  return finding;
}

export function totalFindingCount(
  report: Pick<AuditReport, "totals">,
): number {
  return report.totals.red + report.totals.yellow + report.totals.green;
}

export function findingToDbFields(finding: AgentFinding) {
  return {
    severity: finding.severity,
    title: finding.title,
    detail: finding.detail,
    issue: finding.issue ?? null,
    whyItMatters: finding.whyItMatters ?? null,
    howToFix: finding.howToFix ?? null,
    navigatorTip: finding.navigatorTip ?? null,
    example: finding.example ?? null,
  };
}

export function findingFromDb(row: {
  id: string;
  severity: string;
  title: string;
  detail: string;
  issue?: string | null;
  whyItMatters?: string | null;
  howToFix?: string | null;
  navigatorTip?: string | null;
  example?: string | null;
}): AgentFinding {
  return {
    id: row.id,
    severity: row.severity as FindingSeverity,
    title: row.title,
    detail: row.detail,
    ...(row.issue ? { issue: row.issue } : {}),
    ...(row.whyItMatters ? { whyItMatters: row.whyItMatters } : {}),
    ...(row.howToFix ? { howToFix: row.howToFix } : {}),
    ...(row.navigatorTip ? { navigatorTip: row.navigatorTip } : {}),
    ...(row.example ? { example: row.example } : {}),
  };
}
