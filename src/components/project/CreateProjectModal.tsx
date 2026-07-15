"use client";

import { useEffect, useId, useState } from "react";
import type { ProjectOption } from "@/components/project/ProjectSelect";
import { parseApiResponse } from "@/lib/parse-api-response";

type CreateProjectApiResponse = {
  project: { id: string; name: string };
  error?: string;
};

type CreateProjectModalProps = {
  open: boolean;
  userId?: string | null;
  onClose: () => void;
  onCreated: (project: ProjectOption) => void;
};

export function CreateProjectModal({
  open,
  userId,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const titleId = useId();
  const inputId = useId();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setError(null);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a project name.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          ...(userId ? { userId } : {}),
        }),
      });
      const data = await parseApiResponse<CreateProjectApiResponse>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create project.");
      }
      onCreated({ id: data.project.id, name: data.project.name });
      onClose();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create project.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        aria-label="Close create project dialog"
        onClick={saving ? undefined : onClose}
        tabIndex={saving ? -1 : 0}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <form onSubmit={(event) => void handleSubmit(event)} className="p-6">
          <h2
            id={titleId}
            className="text-lg font-semibold tracking-tight text-zinc-900"
          >
            Create project
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Give this dissertation case a name so later audits stay grouped.
          </p>

          <div className="mt-5">
            <label
              htmlFor={inputId}
              className="mb-1.5 block text-xs font-medium text-zinc-600"
            >
              Project name
            </label>
            <input
              id={inputId}
              type="text"
              autoFocus
              value={name}
              disabled={saving}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Smith, J. — EdD Capstone"
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:bg-zinc-50"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {saving ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
