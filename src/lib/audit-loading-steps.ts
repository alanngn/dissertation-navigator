const LOADING_STEPS = [
  "Let me read through your document.",
  "Mapping the structure.",
  "Running your validation agents in parallel.",
  "Reviewing the manuscript against your criteria.",
  "Collecting findings from each review.",
  "Pulling findings together.",
  "Comparing across agents.",
  "Writing up the report.",
  "Almost done.",
];

export function buildAuditLoadingSteps(): string[] {
  return LOADING_STEPS;
}
