"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { ChevronRightIcon } from "@/components/ui/icons";

type LandingAuthActionsProps = {
  variant?: "header" | "hero" | "cta";
};

export function LandingAuthActions({
  variant = "header",
}: LandingAuthActionsProps) {
  if (variant === "header") {
    return (
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Register
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </Show>
        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Dashboard
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
              },
            }}
          />
        </Show>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Show when="signed-out">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            Create account
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Log in
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            See how it works
          </a>
        </Show>
        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            Go to dashboard
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            See how it works
          </a>
        </Show>
      </div>
    );
  }

  return (
    <Show
      when="signed-out"
      fallback={
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50"
        >
          Go to dashboard
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      }
    >
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50"
        >
          Create account
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-400 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Log in
        </Link>
      </div>
    </Show>
  );
}
