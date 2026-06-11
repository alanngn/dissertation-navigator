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

import { getLegacyPresetsKey } from "@/lib/session-user";

function presetsStorageKey(userId: string): string {
  return `validation-harness:instruction-presets:${userId}`;
}

export const DEFAULT_INSTRUCTIONS = `Analyze the uploaded document and return:
1. A brief summary
2. Key claims or findings
3. Potential validation issues or gaps
4. A pass/fail recommendation with rationale`;

const DEFAULT_PRESET_NAME = "Default validation";

export function createPresetId(): string {
  return crypto.randomUUID();
}

export function createDefaultPreset(): InstructionPreset {
  const now = Date.now();
  return {
    id: createPresetId(),
    name: DEFAULT_PRESET_NAME,
    content: DEFAULT_INSTRUCTIONS,
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
      presets: parsed.presets,
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
