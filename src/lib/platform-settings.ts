import {
  normalizeRules,
  RULE_PRIORITY_LABELS,
  type AgentRule,
} from "@/lib/instruction-presets";

export const PLATFORM_SETTINGS_ID = "platform";

export type PlatformSettings = {
  id: string;
  version: string;
  preamble: string;
  rules: AgentRule[];
  updatedAt: number;
};

/** Actionable platform rules injected into every agent's system prompt. */
export const DEFAULT_PLATFORM_RULES: AgentRule[] = [
  {
    text: "Every finding must include supporting evidence from the dissertation. Never produce unsupported conclusions.",
    priority: "critical",
  },
  {
    text: "Every recommendation must explain why the issue matters within the dissertation development process.",
    priority: "critical",
  },
  {
    text: "Every red or yellow recommendation must include a generic example demonstrating good practice. Examples should teach strong writing without generating content for the student's manuscript.",
    priority: "critical",
  },
  {
    text: "Never generate dissertation content for direct inclusion in a student's manuscript.",
    priority: "critical",
  },
];

export function createDefaultPlatformSettings(): PlatformSettings {
  const now = Date.now();
  return {
    id: PLATFORM_SETTINGS_ID,
    version: "1.0",
    preamble: "",
    rules: DEFAULT_PLATFORM_RULES.map((rule) => ({ ...rule })),
    updatedAt: now,
  };
}

export function normalizePlatformSettings(
  raw: Partial<PlatformSettings> & { rules?: unknown },
): PlatformSettings {
  const defaults = createDefaultPlatformSettings();
  return {
    id: typeof raw.id === "string" ? raw.id : defaults.id,
    version: typeof raw.version === "string" ? raw.version : defaults.version,
    preamble: typeof raw.preamble === "string" ? raw.preamble : defaults.preamble,
    rules: normalizeRules(raw.rules ?? defaults.rules),
    updatedAt:
      typeof raw.updatedAt === "number" ? raw.updatedAt : defaults.updatedAt,
  };
}

/**
 * Formats platform governance rules for injection into the model system prompt.
 * All agents inherit this section at runtime.
 */
export function formatPlatformRulesForPrompt(
  settings: Pick<PlatformSettings, "rules">,
): string {
  const cleanedRules = settings.rules
    .map((rule) => ({
      text: rule.text.trim(),
      priority: rule.priority,
    }))
    .filter((rule) => rule.text.length > 0);

  if (cleanedRules.length === 0) {
    return "";
  }

  const ruleLines = cleanedRules
    .map(
      (rule, index) =>
        `Platform Rule ${index + 1} [${RULE_PRIORITY_LABELS[rule.priority]}]: ${rule.text}`,
    )
    .join("\n");

  return `PLATFORM RULES\nAll agents must follow these rules in every evaluation:\n${ruleLines}`;
}

const PLATFORM_SETTINGS_STORAGE_KEY = "validation-harness:platform-settings";

export function loadPlatformSettingsFromLocal(): PlatformSettings {
  if (typeof window === "undefined") {
    return createDefaultPlatformSettings();
  }

  const raw = localStorage.getItem(PLATFORM_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return createDefaultPlatformSettings();
  }

  try {
    return normalizePlatformSettings(JSON.parse(raw) as PlatformSettings);
  } catch {
    return createDefaultPlatformSettings();
  }
}

export function savePlatformSettingsToLocal(settings: PlatformSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLATFORM_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
