"use client";

import { useState } from "react";
import {
  FindingForm,
  NEW_SECTION_VALUE,
  type FindingFormValues,
} from "@/components/audit/FindingForm";
import { SEVERITY_CONFIG } from "@/components/audit/severity-config";
import { PencilIcon, PlusIcon, TrashIcon, ChevronRightIcon } from "@/components/ui/icons";
import { hasCoachingFormat, type AgentFinding } from "@/lib/audit-types";

export type DisplayFinding = AgentFinding & {
  agentName?: string;
  agentResultId?: string;
};

export type SectionTarget =
  | { sectionId: string }
  | { sectionName: string };

export type FindingsEditor = {
  sectionOptions?: Array<{ id: string; name: string }>;
  defaultSectionId?: string;
  allowNewSection?: boolean;
  onCreate: (values: FindingFormValues, section: SectionTarget) => Promise<void>;
  onUpdate: (findingId: string, values: FindingFormValues) => Promise<void>;
  onDelete: (findingId: string) => Promise<void>;
};

export function FindingsList({
  findings,
  showSection = false,
  showAgent = false,
  editor,
}: {
  findings: DisplayFinding[];
  showSection?: boolean;
  /** @deprecated Use showSection */
  showAgent?: boolean;
  editor?: FindingsEditor;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(
    editor?.defaultSectionId ?? editor?.sectionOptions?.[0]?.id ?? "",
  );
  const [newSectionName, setNewSectionName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const displaySection = showSection || showAgent;

  const grouped = {
    red: findings.filter((f) => f.severity === "red"),
    yellow: findings.filter((f) => f.severity === "yellow"),
    green: findings.filter((f) => f.severity === "green"),
  };

  function startAdding() {
    setEditingId(null);
    setNewSectionName("");
    setSelectedSectionId(
      editor?.defaultSectionId ??
        editor?.sectionOptions?.[0]?.id ??
        (editor?.allowNewSection ? NEW_SECTION_VALUE : ""),
    );
    setAdding(true);
  }

  async function handleDelete(findingId: string) {
    if (!editor) return;
    if (!window.confirm("Delete this finding? This cannot be undone.")) {
      return;
    }

    setBusyId(findingId);
    try {
      await editor.onDelete(findingId);
      if (editingId === findingId) setEditingId(null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Failed to delete finding.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const addControls =
    editor && !adding && editingId === null ? (
      <button
        type="button"
        onClick={startAdding}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
      >
        <PlusIcon className="h-4 w-4" />
        Add finding
      </button>
    ) : null;

  const addForm =
    editor && adding ? (
      <FindingForm
        sectionOptions={
          editor.defaultSectionId ? undefined : editor.sectionOptions
        }
        selectedSectionId={selectedSectionId}
        onSectionIdChange={
          editor.defaultSectionId ? undefined : setSelectedSectionId
        }
        newSectionName={newSectionName}
        onNewSectionNameChange={setNewSectionName}
        allowNewSection={
          Boolean(editor.allowNewSection) && !editor.defaultSectionId
        }
        submitLabel="Add finding"
        onCancel={() => {
          setAdding(false);
          setNewSectionName("");
        }}
        onSubmit={async (values) => {
          if (editor.defaultSectionId) {
            await editor.onCreate(values, {
              sectionId: editor.defaultSectionId,
            });
          } else if (selectedSectionId === NEW_SECTION_VALUE) {
            const name = newSectionName.trim();
            if (!name) {
              throw new Error("Enter a name for the new section.");
            }
            await editor.onCreate(values, { sectionName: name });
          } else if (selectedSectionId) {
            await editor.onCreate(values, { sectionId: selectedSectionId });
          } else {
            throw new Error("Select a section for this finding.");
          }
          setAdding(false);
          setNewSectionName("");
        }}
      />
    ) : null;

  return (
    <div className="space-y-4">
      {addControls}
      {addForm}

      {findings.length === 0 && !adding && (
        <p className="text-sm text-zinc-500">
          {editor
            ? "No findings yet. Add one to get started."
            : "No structured findings returned."}
        </p>
      )}

      {(["red", "yellow", "green"] as const).map((severity) => {
        const items = grouped[severity];
        if (items.length === 0) return null;
        const config = SEVERITY_CONFIG[severity];

        return (
          <div key={severity}>
            <h4
              className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${config.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${config.dot}`} />
              {config.label} ({items.length})
            </h4>
            <ul className="space-y-2">
              {items.map((finding, i) => {
                const findingId = finding.id ?? `${finding.title}-${i}`;
                const isEditing = editor && editingId === finding.id;

                if (isEditing && finding.id) {
                  return (
                    <li key={findingId}>
                      <FindingForm
                        initial={{
                          severity: finding.severity,
                          title: finding.title,
                          detail: finding.detail,
                          issue: finding.issue,
                          whyItMatters: finding.whyItMatters,
                          howToFix: finding.howToFix,
                          navigatorTip: finding.navigatorTip,
                          example: finding.example,
                        }}
                        submitLabel="Save changes"
                        onCancel={() => setEditingId(null)}
                        onSubmit={async (values) => {
                          await editor.onUpdate(finding.id!, values);
                          setEditingId(null);
                        }}
                      />
                    </li>
                  );
                }

                return (
                  <li
                    key={findingId}
                    className={`rounded-lg border px-4 py-3 ${config.border} bg-white`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        {displaySection && finding.agentName && (
                          <p className="mb-1 text-xs font-medium text-zinc-400">
                            {finding.agentName}
                          </p>
                        )}
                        <p className="text-sm font-medium text-zinc-900">
                          {finding.title}
                        </p>
                        <FindingBody finding={finding} />
                        {finding.example &&
                          (finding.severity === "red" ||
                            finding.severity === "yellow") && (
                            <FindingExample example={finding.example} />
                          )}
                      </div>

                      {editor && finding.id && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAdding(false);
                              setEditingId(finding.id!);
                            }}
                            disabled={busyId === finding.id}
                            aria-label={`Edit ${finding.title}`}
                            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(finding.id!)}
                            disabled={busyId === finding.id}
                            aria-label={`Delete ${finding.title}`}
                            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export { SEVERITY_CONFIG } from "@/components/audit/severity-config";

const COACHING_SECTIONS = [
  { key: "issue", label: "Issue" },
  { key: "whyItMatters", label: "Why It Matters" },
  { key: "howToFix", label: "How to Fix It" },
  { key: "navigatorTip", label: "Navigator Tip" },
] as const;

function FindingBody({ finding }: { finding: AgentFinding }) {
  if (
    (finding.severity === "red" || finding.severity === "yellow") &&
    hasCoachingFormat(finding)
  ) {
    return (
      <dl className="mt-2 space-y-2">
        {COACHING_SECTIONS.map(({ key, label }) => {
          const value = finding[key];
          if (!value) return null;
          return (
            <div key={key}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-zinc-600">
                {value}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  if (finding.detail !== finding.title) {
    return (
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        {finding.detail}
      </p>
    );
  }

  return null;
}

function FindingExample({ example }: { example: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition hover:text-indigo-500"
        aria-expanded={expanded}
      >
        <ChevronRightIcon
          className={`transition ${expanded ? "rotate-90" : ""}`}
        />
        {expanded ? "Hide example" : "View example"}
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400">
            Example of good practice
          </p>
          <p className="mt-0.5 text-[11px] text-indigo-500/80">
            Illustrative pattern (placeholder topic)
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">
            {example}
          </p>
        </div>
      )}
    </div>
  );
}
