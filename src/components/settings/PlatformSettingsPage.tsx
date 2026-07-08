"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { usePresets } from "@/components/providers/PresetsProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { RULE_PRIORITY_LABELS, type AgentRulePriority } from "@/lib/instruction-presets";

const MAX_RULE = 1000;

export function PlatformSettingsPage() {
  const toast = useToast();
  const { canEditPresets } = usePresets();
  const {
    settings,
    ready,
    isDirty,
    usingDatabase,
    saving,
    syncError,
    addRule,
    updateRule,
    updateRulePriority,
    removeRule,
    saveSettings,
  } = usePlatformSettings();

  const [message, setMessage] = useState<string | null>(null);
  const readOnly = !canEditPresets;

  async function handleSave() {
    setMessage(null);
    const ok = await saveSettings();
    if (ok) {
      toast.success(
        usingDatabase
          ? "Platform settings saved."
          : "Platform settings saved locally.",
      );
    } else {
      setMessage("Could not save platform settings.");
    }
  }

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Loading platform settings…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-50">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Platform Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Global governance rules inherited by every agent at runtime.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isDirty}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {readOnly && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Read-only view — switch to your session to edit platform settings.
            </p>
          )}

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
            <p className="font-medium">How inheritance works</p>
            <p className="mt-1 text-indigo-800/90">
              Platform rules are injected into every agent&apos;s system prompt
              when audits and tests run. Agent-specific purpose, business
              function, and rules remain separate — they specialize within this
              shared governance framework.{" "}
              <Link href="/agents" className="font-medium underline">
                View agents
              </Link>
            </p>
          </div>

          {syncError && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {syncError}
            </p>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-900">
                Platform rules
              </label>
              <span className="text-xs text-zinc-400">
                {settings.rules.length} rule{settings.rules.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Behavioral requirements every agent must follow when producing
              findings and recommendations.
            </p>

            {settings.rules.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400">
                No platform rules defined.
              </p>
            ) : (
              <ul className="space-y-3">
                {settings.rules.map((rule, index) => (
                  <li
                    key={index}
                    className="rounded-xl border border-zinc-200 bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-500">
                        Platform Rule {index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <PriorityToggle
                          value={rule.priority}
                          disabled={readOnly}
                          onChange={(priority) =>
                            updateRulePriority(index, priority)
                          }
                          ruleIndex={index}
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeRule(index)}
                            title="Remove rule"
                            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={rule.text}
                      onChange={(e) =>
                        updateRule(index, e.target.value.slice(0, MAX_RULE))
                      }
                      rows={3}
                      disabled={readOnly}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2 disabled:bg-zinc-50"
                    />
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
                Add Platform Rule
              </button>
            )}
          </div>

          {message && <p className="text-sm text-zinc-600">{message}</p>}
        </div>
      </div>
    </div>
  );
}

function PriorityToggle({
  value,
  onChange,
  disabled,
  ruleIndex,
}: {
  value: AgentRulePriority;
  onChange: (priority: AgentRulePriority) => void;
  disabled?: boolean;
  ruleIndex: number;
}) {
  const options: AgentRulePriority[] = ["critical", "moderate"];

  return (
    <div
      className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5"
      role="group"
      aria-label={`Priority for rule ${ruleIndex + 1}`}
    >
      {options.map((priority) => (
        <button
          key={priority}
          type="button"
          disabled={disabled}
          onClick={() => onChange(priority)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition ${
            value === priority
              ? priority === "critical"
                ? "bg-red-100 text-red-800"
                : "bg-amber-100 text-amber-800"
              : "text-zinc-500 hover:text-zinc-700"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {RULE_PRIORITY_LABELS[priority]}
        </button>
      ))}
    </div>
  );
}
