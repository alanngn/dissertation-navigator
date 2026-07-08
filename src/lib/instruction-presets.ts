export type AgentRulePriority = "critical" | "moderate";

export type AgentRule = {
  text: string;
  priority: AgentRulePriority;
};

export type InstructionPreset = {
  id: string;
  name: string;
  /** What the agent is for. */
  purpose: string;
  /** What the agent evaluates and why it matters. */
  businessFunction: string;
  /** Individually managed rules the agent enforces. */
  rules: AgentRule[];
  /** Composed prompt derived from purpose, business function, and rules. */
  content: string;
  updatedAt: number;
};

export type InstructionPresetStore = {
  presets: InstructionPreset[];
  activeId: string | null;
};

import { getLegacyPresetsKey } from "@/lib/session-user";

function presetsStorageKey(userId: string): string {
  return `validation-harness:instruction-presets:${userId}`;
}

export const RULE_PRIORITIES: AgentRulePriority[] = ["critical", "moderate"];

export const RULE_PRIORITY_LABELS: Record<AgentRulePriority, string> = {
  critical: "Critical",
  moderate: "Moderate",
};

export const DEFAULT_PURPOSE = `Evaluate the uploaded dissertation document in your area of expertise, assisting students in developing, refining, and validating their work before it advances to the next stage.`;

export const DEFAULT_BUSINESS_FUNCTION = `Assess the document for scholarly quality, clarity, methodological accuracy, alignment, and institutional compliance. Identify weaknesses that may result in committee revisions, rejection, or proposal delays.`;

export const DEFAULT_RULES: AgentRule[] = [
  {
    text: "Report critical gaps, errors, or misalignments as red findings.",
    priority: "critical",
  },
  {
    text: "Report moderate issues or improvement opportunities as yellow findings.",
    priority: "critical",
  },
  {
    text: "Report strengths and well-executed elements as green findings.",
    priority: "critical",
  },
  {
    text: "Be specific and reference evidence from the document.",
    priority: "critical",
  },
];

const DEFAULT_PRESET_NAME = "Default validation";

export function createEmptyRule(
  priority: AgentRulePriority = "critical",
): AgentRule {
  return { text: "", priority };
}

export function isAgentRulePriority(value: unknown): value is AgentRulePriority {
  return value === "critical" || value === "moderate";
}

/**
 * Normalizes a rule from legacy string form or a partial object.
 * Invalid or missing priorities default to critical.
 */
export function normalizeRule(raw: unknown): AgentRule | null {
  if (typeof raw === "string") {
    return { text: raw, priority: "critical" };
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as { text?: unknown; priority?: unknown };
  if (typeof candidate.text !== "string") {
    return null;
  }

  return {
    text: candidate.text,
    priority: isAgentRulePriority(candidate.priority)
      ? candidate.priority
      : "critical",
  };
}

export function normalizeRules(raw: unknown): AgentRule[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeRule)
    .filter((rule): rule is AgentRule => rule !== null);
}

/**
 * Builds the prompt sent to the model from an agent's three structured inputs.
 * Empty sections are omitted, and rules are numbered for the model.
 */
export function composeInstructions(
  purpose: string,
  businessFunction: string,
  rules: AgentRule[],
): string {
  const sections: string[] = [];

  if (purpose.trim()) {
    sections.push(`PURPOSE\n${purpose.trim()}`);
  }

  if (businessFunction.trim()) {
    sections.push(`BUSINESS FUNCTION\n${businessFunction.trim()}`);
  }

  const cleanedRules = rules
    .map((rule) => ({
      text: rule.text.trim(),
      priority: isAgentRulePriority(rule.priority) ? rule.priority : "critical",
    }))
    .filter((rule) => rule.text.length > 0);

  if (cleanedRules.length > 0) {
    const ruleLines = cleanedRules
      .map(
        (rule, index) =>
          `Rule ${index + 1} [${RULE_PRIORITY_LABELS[rule.priority]}]: ${rule.text}`,
      )
      .join("\n");
    sections.push(
      `RULES\nEvaluate the document against each of the following rules.\nTreat Critical rules as red findings when violated; treat Moderate rules as yellow findings when violated:\n${ruleLines}`,
    );
  }

  return sections.join("\n\n");
}

/**
 * Ensures a preset has the structured fields, backfilling from legacy
 * single-string `content` when older records are loaded.
 */
export function normalizePreset(
  preset: Omit<InstructionPreset, "rules"> & { rules?: unknown },
): InstructionPreset {
  const purpose = typeof preset.purpose === "string" ? preset.purpose : "";
  const businessFunction =
    typeof preset.businessFunction === "string" ? preset.businessFunction : "";
  const rules = normalizeRules(preset.rules);

  const hasStructured =
    purpose.trim().length > 0 ||
    businessFunction.trim().length > 0 ||
    rules.length > 0;

  const legacyContent = typeof preset.content === "string" ? preset.content : "";
  const effectivePurpose = hasStructured ? purpose : legacyContent;

  const content =
    composeInstructions(effectivePurpose, businessFunction, rules) ||
    legacyContent;

  return {
    id: preset.id,
    name: preset.name,
    purpose: effectivePurpose,
    businessFunction,
    rules,
    content,
    updatedAt: preset.updatedAt,
  };
}

export function createPresetId(): string {
  return crypto.randomUUID();
}

export function createDefaultPreset(): InstructionPreset {
  const now = Date.now();
  return {
    id: createPresetId(),
    name: DEFAULT_PRESET_NAME,
    purpose: DEFAULT_PURPOSE,
    businessFunction: DEFAULT_BUSINESS_FUNCTION,
    rules: DEFAULT_RULES.map((rule) => ({ ...rule })),
    content: composeInstructions(
      DEFAULT_PURPOSE,
      DEFAULT_BUSINESS_FUNCTION,
      DEFAULT_RULES,
    ),
    updatedAt: now,
  };
}

export function createDefaultStore(): InstructionPresetStore {
  const preset = createDefaultPreset();
  return { presets: [preset], activeId: preset.id };
}

function parsePresetStore(raw: string): InstructionPresetStore | null {
  try {
    const parsed = JSON.parse(raw) as InstructionPresetStore;
    if (!Array.isArray(parsed.presets) || parsed.presets.length === 0) {
      return null;
    }

    return {
      presets: parsed.presets.map(normalizePreset),
      activeId: parsed.activeId ?? parsed.presets[0]?.id ?? null,
    };
  } catch {
    return null;
  }
}

export function loadInstructionPresetsFromLocal(
  userId: string,
): InstructionPresetStore {
  if (typeof window === "undefined") {
    return createDefaultStore();
  }

  const userKey = presetsStorageKey(userId);
  const userRaw = localStorage.getItem(userKey);
  if (userRaw) {
    const store = parsePresetStore(userRaw);
    if (store) return store;
  }

  const legacyRaw = localStorage.getItem(getLegacyPresetsKey());
  if (legacyRaw) {
    const store = parsePresetStore(legacyRaw);
    if (store) {
      saveInstructionPresets(store, userId);
      localStorage.removeItem(getLegacyPresetsKey());
      return store;
    }
  }

  return createDefaultStore();
}

/** @deprecated Use loadInstructionPresetsFromLocal(userId) */
export function loadInstructionPresets(): InstructionPresetStore {
  return createDefaultStore();
}

export function saveInstructionPresets(
  store: InstructionPresetStore,
  userId: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(presetsStorageKey(userId), JSON.stringify(store));
}
