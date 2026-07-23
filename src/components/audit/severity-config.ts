import type { FindingSeverity } from "@/lib/audit-types";

export const SEVERITY_CONFIG: Record<
  FindingSeverity,
  {
    label: string;
    description: string;
    dot: string;
    text: string;
    border: string;
    bg: string;
  }
> = {
  red: {
    label: "Critical Issues",
    description: "Needs revision before committee review.",
    dot: "bg-red-600",
    text: "text-red-900",
    border: "border-red-300",
    bg: "bg-red-100",
  },
  yellow: {
    label: "Recommended Improvements",
    description: "Strengthen scholarly quality.",
    dot: "bg-amber-600",
    text: "text-amber-950",
    border: "border-amber-300",
    bg: "bg-amber-100",
  },
  green: {
    label: "Strengths",
    description: "Areas completed successfully.",
    dot: "bg-emerald-600",
    text: "text-emerald-900",
    border: "border-emerald-300",
    bg: "bg-emerald-100",
  },
};
