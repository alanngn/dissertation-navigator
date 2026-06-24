"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useInstructionPresets,
  type UseInstructionPresetsReturn,
} from "@/hooks/useInstructionPresets";

const PresetsContext = createContext<UseInstructionPresetsReturn | null>(null);

export function PresetsProvider({ children }: { children: ReactNode }) {
  const value = useInstructionPresets();
  return (
    <PresetsContext.Provider value={value}>{children}</PresetsContext.Provider>
  );
}

export function usePresets() {
  const context = useContext(PresetsContext);
  if (!context) {
    throw new Error("usePresets must be used within PresetsProvider");
  }
  return context;
}

export type { UseInstructionPresetsReturn };
