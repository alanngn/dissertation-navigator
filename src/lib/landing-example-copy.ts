/** Static example copy for the landing page, inspired by real audit output. */
export const LANDING_EXAMPLE = {
  fileName: "Dissertation Draft.pdf",
  agentsCompleted: 8,
  findings: [
    {
      severity: "critical" as const,
      title: "Conflicting framework naming",
      agent: "Conceptual Framework Validation",
      summary:
        "The manuscript identifies two different conceptual frameworks in separate sections.",
    },
    {
      severity: "critical" as const,
      title: "Overlong title wording",
      agent: "Topic & Title Development",
      summary:
        "The title uses unnecessary repetition and stacked modifiers that make it longer than needed.",
    },
    {
      severity: "recommended" as const,
      title: "Inconsistent data sources",
      agent: "Methodology Validation",
      summary:
        "Interviews and document analysis are named as core methods, but focus groups appear later without rationale.",
    },
  ],
};

export const LANDING_SEVERITY_STYLES = {
  critical: {
    label: "Critical",
    dot: "bg-red-600",
    badge: "bg-red-50 text-red-700 border-red-100",
  },
  recommended: {
    label: "Recommended",
    dot: "bg-amber-600",
    badge: "bg-amber-50 text-amber-800 border-amber-100",
  },
} as const;
