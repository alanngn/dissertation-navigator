export type InstructionPreset = {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
};

export type InstructionPresetStore = {
  presets: InstructionPreset[];
  activeId: string | null;
};

const STORAGE_KEY = "validation-harness:instruction-presets";

export const DEFAULT_INSTRUCTIONS = `Analyze the uploaded document and return:
1. A brief summary
2. Key claims or findings
3. Potential validation issues or gaps
4. A pass/fail recommendation with rationale`;

const DEFAULT_PRESET_NAME = "Default validation";

export function createPresetId(): string {
  return crypto.randomUUID();
}

function createDefaultPreset(): InstructionPreset {
  const now = Date.now();
  return {
    id: createPresetId(),
    name: DEFAULT_PRESET_NAME,
    content: DEFAULT_INSTRUCTIONS,
    updatedAt: now,
  };
}

export function loadInstructionPresets(): InstructionPresetStore {
  if (typeof window === "undefined") {
    const preset = createDefaultPreset();
    return { presets: [preset], activeId: preset.id };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const preset = createDefaultPreset();
      return { presets: [preset], activeId: preset.id };
    }

    const parsed = JSON.parse(raw) as InstructionPresetStore;
    if (!Array.isArray(parsed.presets) || parsed.presets.length === 0) {
      const preset = createDefaultPreset();
      return { presets: [preset], activeId: preset.id };
    }

    return {
      presets: parsed.presets,
      activeId: parsed.activeId ?? parsed.presets[0]?.id ?? null,
    };
  } catch {
    const preset = createDefaultPreset();
    return { presets: [preset], activeId: preset.id };
  }
}

export function saveInstructionPresets(store: InstructionPresetStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
