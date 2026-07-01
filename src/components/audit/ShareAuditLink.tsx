"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, CopyIcon, LinkIcon } from "@/components/ui/icons";

const COPIED_RESET_MS = 2500;

type ShareAuditLinkProps = {
  slug: string;
  variant?: "prominent" | "compact";
};

function buildShareUrl(slug: string): string {
  if (typeof window === "undefined") {
    return `/audits/${slug}`;
  }
  return `${window.location.origin}/audits/${slug}`;
}

export function ShareAuditLink({
  slug,
  variant = "prominent",
}: ShareAuditLinkProps) {
  const [shareUrl, setShareUrl] = useState(() => buildShareUrl(slug));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShareUrl(buildShareUrl(slug));
  }, [slug]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
          Shareable link
        </p>
        <p className="mt-2 truncate font-mono text-xs text-zinc-600">
          {shareUrl}
        </p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            copied
              ? "bg-emerald-600 text-white"
              : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}
        >
          {copied ? (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              Link copied
            </>
          ) : (
            <>
              <CopyIcon />
              Copy link
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <LinkIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Share this audit
            </h2>
            <p className="mt-0.5 text-sm text-zinc-600">
              Anyone with the link can view this report.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            copied
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
          }`}
        >
          {copied ? (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon />
              Copy link
            </>
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-indigo-100 bg-white/80 px-3 py-2.5">
        <p className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-600">
          {shareUrl}
        </p>
        {copied && (
          <span className="shrink-0 text-xs font-medium text-emerald-600">
            Copied to clipboard
          </span>
        )}
      </div>
    </div>
  );
}
