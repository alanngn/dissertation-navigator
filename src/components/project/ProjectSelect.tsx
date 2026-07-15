"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { parseApiResponse } from "@/lib/parse-api-response";

export type ProjectOption = {
  id: string;
  name: string;
};

type ProjectsApiResponse = {
  projects: Array<{ id: string; name: string }>;
  error?: string;
};

type ProjectSelectProps = {
  value: ProjectOption | null;
  onChange: (project: ProjectOption | null) => void;
  onCreateNew: () => void;
  disabled?: boolean;
  required?: boolean;
};

export function ProjectSelect({
  value,
  onChange,
  onCreateNew,
  disabled = false,
  required = false,
}: ProjectSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("search", query.trim());
        const response = await fetch(`/api/projects?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await parseApiResponse<ProjectsApiResponse>(response);
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load projects.");
        }
        setProjects(
          data.projects.map((project) => ({
            id: project.id,
            name: project.name,
          })),
        );
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load projects.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(project: ProjectOption) {
    onChange(project);
    setOpen(false);
    setQuery("");
  }

  function handleCreateNew() {
    setOpen(false);
    setQuery("");
    onCreateNew();
  }

  const filtered = query.trim()
    ? projects.filter((project) =>
        project.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : projects;

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-zinc-600">
        Project
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
          open
            ? "border-indigo-300 ring-2 ring-indigo-100"
            : "border-zinc-200 hover:border-zinc-300"
        } ${
          disabled
            ? "cursor-not-allowed bg-zinc-50 text-zinc-400"
            : "bg-white text-zinc-900"
        }`}
      >
        <span className={value ? "truncate font-medium" : "text-zinc-400"}>
          {value?.name ?? "Search or select a project…"}
        </span>
        <ChevronDownIcon
          className={`shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
        >
          <div className="border-b border-zinc-100 p-2">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            {loading && (
              <p className="px-3 py-3 text-center text-xs text-zinc-400">
                Loading…
              </p>
            )}

            {!loading && error && (
              <p className="px-3 py-3 text-center text-xs text-red-600">
                {error}
              </p>
            )}

            {!loading && !error && filtered.length === 0 && (
              <p className="px-3 py-3 text-center text-xs text-zinc-400">
                No projects found
              </p>
            )}

            {!loading &&
              !error &&
              filtered.map((project) => {
                const selected = value?.id === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(project)}
                    className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-zinc-50 ${
                      selected
                        ? "bg-indigo-50 font-medium text-indigo-700"
                        : "text-zinc-700"
                    }`}
                  >
                    {project.name}
                  </button>
                );
              })}
          </div>

          <div className="border-t border-zinc-100 p-1.5">
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
            >
              <PlusIcon />
              Create new project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `h-4 w-4 ${className}` : "h-4 w-4"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}
