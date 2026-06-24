"use client";

import { formatBytes } from "@/lib/format";
import { UploadIcon } from "@/components/ui/icons";

const ACCEPT =
  ".pdf,.txt,.md,.markdown,.docx,.doc,.csv,.json,.xml,.html,.htm,text/*,application/pdf";

type FileUploadProps = {
  file: File | null;
  onFileChange: (file: File | null, error?: string) => void;
  disabled?: boolean;
  maxSizeLabel?: string;
};

export function FileUpload({
  file,
  onFileChange,
  disabled = false,
  maxSizeLabel = "PDF, DOCX (Max 4 MB)",
}: FileUploadProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    onFileChange(selected);
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="file-upload"
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center transition ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:border-indigo-300 hover:bg-indigo-50/30"
        }`}
      >
        <UploadIcon className="mb-3 h-8 w-8 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-700">
          Drag and drop your dissertation here
        </span>
        <span className="mt-1 text-xs text-zinc-500">or</span>
        <span className="mt-2 inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 shadow-sm">
          Browse Files
        </span>
        <span className="mt-3 text-xs text-zinc-400">{maxSizeLabel}</span>
        <input
          id="file-upload"
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
      </label>

      {file && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-emerald-900">{file.name}</p>
            <p className="text-xs text-emerald-700">{formatBytes(file.size)}</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="shrink-0 text-xs text-zinc-500 hover:text-zinc-700"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
