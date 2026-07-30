"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePresets } from "@/components/providers/PresetsProvider";
import { getClerkEmail } from "@/lib/session-user";
import {
  AgentsIcon,
  AuditsIcon,
  BookIcon,
  DashboardIcon,
  SettingsIcon,
} from "@/components/ui/icons";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof DashboardIcon;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/agents", label: "Agents", icon: AgentsIcon },
  { href: "/audits", label: "Audit History", icon: AuditsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user: clerkUser } = useUser();
  const { users, sessionUserId, ready } = usePresets();

  const currentUser =
    users.find((u) => u.id === sessionUserId) ?? users[0];
  const displayEmail =
    currentUser?.email ??
    (clerkUser ? getClerkEmail(clerkUser) : undefined);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <BookIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Dissertation</p>
          <p className="text-sm font-semibold text-zinc-900">Navigator</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-100 px-5 py-4">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Powered by OpenAI
        </p>
        {ready && clerkUser && (
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">
                {displayEmail ?? "User"}
              </p>
              <p className="truncate text-xs text-zinc-500 capitalize">
                {currentUser?.role ?? "user"}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
