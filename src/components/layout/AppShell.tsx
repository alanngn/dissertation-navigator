"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { PresetsProvider } from "@/components/providers/PresetsProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PresetsProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </PresetsProvider>
  );
}
