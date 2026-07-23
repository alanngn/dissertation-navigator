"use client";

import { useEffect, useState } from "react";
import { SEVERITY_CONFIG } from "@/components/audit/severity-config";
import type { AgentFinding, FindingSeverity } from "@/lib/audit-types";

export type FindingFormValues = Pick<
  AgentFinding,
  | "severity"
  | "title"
  | "detail"
  | "issue"
  | "whyItMatters"
  | "howToFix"
  | "navigatorTip"
  | "example"
>;

export const NEW_SECTION_VALUE = "__new_section__";

type FindingFormProps = {
  initial?: FindingFormValues;
  sectionOptions?: Array<{ id: string; name: string }>;
  selectedSectionId?: string;
  onSectionIdChange?: (sectionId: string) => void;
  newSectionName?: string;
  onNewSectionNameChange?: (name: string) => void;
  allowNewSection?: boolean;
  submitLabel: string;
  onSubmit: (values: FindingFormValues) => Promise<void>;
  onCancel: () => void;
};

const SEVERITIES: FindingSeverity[] = ["red", "yellow", "green"];

const COACHING_FIELDS = [
  { key: "issue", label: "Issue", placeholder: "One sentence stating the issue." },
  {
    key: "whyItMatters",
    label: "Why It Matters",
    placeholder: "One sentence explaining why it matters.",
  },
  {
    key: "howToFix",
    label: "How to Fix It",
    placeholder: "One sentence describing how to fix it.",
  },
  {
    key: "navigatorTip",
    label: "Navigator Tip",
    placeholder: "One sentence with a concrete actionable tip.",
  },
] as const;

export function FindingForm({
  initial,
  sectionOptions,
  selectedSectionId,
  onSectionIdChange,
  newSectionName = "",
  onNewSectionNameChange,
  allowNewSection = false,
  submitLabel,
  onSubmit,
  onCancel,
}: FindingFormProps) {
  const [severity, setSeverity] = useState<FindingSeverity>(
    initial?.severity ?? "yellow",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [issue, setIssue] = useState(initial?.issue ?? "");
  const [whyItMatters, setWhyItMatters] = useState(initial?.whyItMatters ?? "");
  const [howToFix, setHowToFix] = useState(initial?.howToFix ?? "");
  const [navigatorTip, setNavigatorTip] = useState(initial?.navigatorTip ?? "");
  const [example, setExample] = useState(initial?.example ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showSectionPicker = Boolean(
    onSectionIdChange && (allowNewSection || (sectionOptions?.length ?? 0) > 0),
  );
  const isNewSection = selectedSectionId === NEW_SECTION_VALUE;
  const isRecommendation = severity === "red" || severity === "yellow";

  const coachingValues = {
    issue,
    whyItMatters,
    howToFix,
    navigatorTip,
  };

  const coachingSetters = {
    issue: setIssue,
    whyItMatters: setWhyItMatters,
    howToFix: setHowToFix,
    navigatorTip: setNavigatorTip,
  };

  useEffect(() => {
    setSeverity(initial?.severity ?? "yellow");
    setTitle(initial?.title ?? "");
    setDetail(initial?.detail ?? "");
    setIssue(initial?.issue ?? "");
    setWhyItMatters(initial?.whyItMatters ?? "");
    setHowToFix(initial?.howToFix ?? "");
    setNavigatorTip(initial?.navigatorTip ?? "");
    setExample(initial?.example ?? "");
    setError(null);
  }, [initial]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDetail = detail.trim();
    const trimmedExample = example.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (showSectionPicker) {
      if (!selectedSectionId) {
        setError("Select a section for this finding.");
        return;
      }
      if (isNewSection && !newSectionName.trim()) {
        setError("Enter a name for the new section.");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const values: FindingFormValues = {
        severity,
        title: trimmedTitle,
        detail: trimmedDetail || trimmedTitle,
        example:
          isRecommendation && trimmedExample ? trimmedExample : undefined,
      };

      if (isRecommendation) {
        const trimmedIssue = issue.trim();
        const trimmedWhy = whyItMatters.trim();
        const trimmedFix = howToFix.trim();
        const trimmedTip = navigatorTip.trim();
        if (trimmedIssue) values.issue = trimmedIssue;
        if (trimmedWhy) values.whyItMatters = trimmedWhy;
        if (trimmedFix) values.howToFix = trimmedFix;
        if (trimmedTip) values.navigatorTip = trimmedTip;
      }

      await onSubmit(values);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save finding.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4"
    >
      {showSectionPicker && onSectionIdChange && (
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              Section
            </span>
            <select
              value={selectedSectionId ?? ""}
              onChange={(event) => onSectionIdChange(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" disabled>
                Select a section
              </option>
              {(sectionOptions ?? []).map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
              {allowNewSection && (
                <option value={NEW_SECTION_VALUE}>+ New section</option>
              )}
            </select>
          </label>

          {isNewSection && onNewSectionNameChange && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600">
                New section name
              </span>
              <input
                type="text"
                value={newSectionName}
                onChange={(event) => onNewSectionNameChange(event.target.value)}
                placeholder="e.g. Methodology"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          )}
        </div>
      )}

      <fieldset>
        <legend className="mb-1 text-xs font-medium text-zinc-600">
          Severity
        </legend>
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((value) => {
            const config = SEVERITY_CONFIG[value];
            const selected = severity === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSeverity(value)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? `${config.border} ${config.text} bg-white shadow-sm`
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                {config.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600">
          Title
        </span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Short scan label (3–5 words)"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      {isRecommendation ? (
        COACHING_FIELDS.map(({ key, label, placeholder }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              {label}
            </span>
            <textarea
              value={coachingValues[key]}
              onChange={(event) =>
                coachingSetters[key](event.target.value)
              }
              rows={2}
              placeholder={placeholder}
              className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        ))
      ) : (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            Detail
          </span>
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            rows={3}
            placeholder="Brief description of the strength"
            className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      )}

      {isRecommendation && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            Example
            <span className="ml-1 font-normal text-zinc-400">
              (illustrative pattern)
            </span>
          </span>
          <textarea
            value={example}
            onChange={(event) => setExample(event.target.value)}
            rows={3}
            placeholder='A good title would look like "Early-Career Teacher Retention in Urban Districts: A Qualitative Case Study."'
            className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-900 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
