"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrashIcon } from "@/components/ui/icons";
import { parseApiResponse } from "@/lib/parse-api-response";

type DeleteAuditButtonProps = {
  slug: string;
  fileName: string;
  variant?: "icon" | "button";
  onDeleted?: () => void;
};

export function DeleteAuditButton({
  slug,
  fileName,
  variant = "icon",
  onDeleted,
}: DeleteAuditButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete the audit for "${fileName}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/audits/${slug}`, {
        method: "DELETE",
      });
      const data = await parseApiResponse<{ ok?: boolean; error?: string }>(
        response,
      );

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete audit.");
      }

      if (onDeleted) {
        onDeleted();
      } else {
        router.push("/audits");
        router.refresh();
      }
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Failed to delete audit.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={deleting}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
        {deleting ? "Deleting…" : "Delete audit"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={deleting}
      aria-label={`Delete audit for ${fileName}`}
      className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
