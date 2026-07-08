"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { PresetsProvider } from "@/components/providers/PresetsProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PresetsProvider>
        <div className="flex h-screen overflow-hidden bg-zinc-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </PresetsProvider>
    </ToastProvider>
  );
}
