const AGENT_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

export function agentColorClass(index: number): string {
  return AGENT_COLORS[index % AGENT_COLORS.length]!;
}

export function agentInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "A";
}
