import type { AgentFinding, FindingSeverity } from "@/lib/audit-types";

export type DisplayFinding = AgentFinding & { agentName?: string };

const SEVERITY_CONFIG: Record<
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

export function FindingsList({
  findings,
  showAgent = false,
}: {
  findings: DisplayFinding[];
  showAgent?: boolean;
}) {
  const grouped = {
    red: findings.filter((f) => f.severity === "red"),
    yellow: findings.filter((f) => f.severity === "yellow"),
    green: findings.filter((f) => f.severity === "green"),
  };

  if (findings.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No structured findings returned.</p>
    );
  }

  return (
    <div className="space-y-4">
      {(["red", "yellow", "green"] as const).map((severity) => {
        const items = grouped[severity];
        if (items.length === 0) return null;
        const config = SEVERITY_CONFIG[severity];

        return (
          <div key={severity}>
            <h4
              className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${config.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${config.dot}`} />
              {config.label} ({items.length})
            </h4>
            <ul className="space-y-2">
              {items.map((finding, i) => (
                <li
                  key={`${finding.title}-${finding.agentName ?? ""}-${i}`}
                  className={`rounded-lg border px-4 py-3 ${config.border} bg-white`}
                >
                  {showAgent && finding.agentName && (
                    <p className="mb-1 text-xs font-medium text-zinc-400">
                      {finding.agentName}
                    </p>
                  )}
                  <p className="text-sm font-medium text-zinc-900">
                    {finding.title}
                  </p>
                  {finding.detail !== finding.title && (
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                      {finding.detail}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export { SEVERITY_CONFIG };
