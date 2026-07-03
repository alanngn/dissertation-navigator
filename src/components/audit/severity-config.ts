import type { FindingSeverity } from "@/lib/audit-types";

export const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; dot: string; text: string; border: string }
> = {
  red: {
    label: "Critical",
    dot: "bg-red-500",
    text: "text-red-800",
    border: "border-red-200",
  },
  yellow: {
    label: "Moderate",
    dot: "bg-amber-400",
    text: "text-amber-900",
    border: "border-amber-200",
  },
  green: {
    label: "Strengths",
    dot: "bg-emerald-500",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
};
