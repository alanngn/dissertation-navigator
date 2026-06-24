"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePresets } from "@/components/providers/PresetsProvider";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { agentColorClass, agentInitial } from "@/lib/agent-display";
import { formatDate, presetDescription } from "@/lib/format";
import { DEFAULT_MODEL, MODELS } from "@/lib/models";

export function AgentsListPage() {
  const router = useRouter();
  const {
    ready,
    presets,
    canEditPresets,
    startNewDraft,
    deletePresetById,
  } = usePresets();

  function handleAddAgent() {
    if (!canEditPresets) return;
    const result = startNewDraft();
    if (!("error" in result)) {
      router.push("/agents/new");
    }
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const result = deletePresetById(id);
    if ("error" in result && result.error) {
      window.alert(result.error);
    }
  }

  const defaultModelLabel =
    MODELS.find((m) => m.id === DEFAULT_MODEL)?.label ?? DEFAULT_MODEL;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 bg-white px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Manage Agents</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create and configure the validation agents used in audits.
            </p>
          </div>
          {canEditPresets && (
            <button
              type="button"
              onClick={handleAddAgent}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              <PlusIcon />
              Add Agent
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-5 py-3 font-medium text-zinc-500">Agent</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Description</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Model</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Last Updated</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!ready && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                    Loading agents…
                  </td>
                </tr>
              )}
              {ready &&
                presets.map((preset, index) => (
                  <tr key={preset.id} className="transition hover:bg-zinc-50/50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/agents/${preset.id}`}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${agentColorClass(index)}`}
                        >
                          {agentInitial(preset.name)}
                        </div>
                        <span className="font-medium text-zinc-900">
                          {preset.name}
                        </span>
                      </Link>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-zinc-500">
                      <span className="line-clamp-2">
                        {presetDescription(preset.purpose || preset.content, 100)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-600">{defaultModelLabel}</td>
                    <td className="px-5 py-4">
                      <StatusBadge label="Active" />
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {formatDate(preset.updatedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/agents/${preset.id}`}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                          title="Edit"
                        >
                          <PencilIcon />
                        </Link>
                        {canEditPresets && (
                          <button
                            type="button"
                            onClick={() => handleDelete(preset.id, preset.name)}
                            className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {ready && (
          <p className="mt-4 text-xs text-zinc-400">
            {presets.length} agent{presets.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
