"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createPresetId,
  DEFAULT_INSTRUCTIONS,
  loadInstructionPresets,
  saveInstructionPresets,
  type InstructionPreset,
} from "@/lib/instruction-presets";

export function useInstructionPresets() {
  const [presets, setPresets] = useState<InstructionPreset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [presetName, setPresetName] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const store = loadInstructionPresets();
    const active = store.presets.find((preset) => preset.id === store.activeId);

    setPresets(store.presets);
    setActiveId(store.activeId);
    setInstructions(active?.content ?? DEFAULT_INSTRUCTIONS);
    setPresetName(active?.name ?? "");
    setReady(true);
  }, []);

  const persist = useCallback(
    (nextPresets: InstructionPreset[], nextActiveId: string | null) => {
      setPresets(nextPresets);
      setActiveId(nextActiveId);
      saveInstructionPresets({ presets: nextPresets, activeId: nextActiveId });
    },
    [],
  );

  const activePreset = presets.find((preset) => preset.id === activeId) ?? null;
  const isDraft = activeId === null;

  function updateInstructions(value: string) {
    setInstructions(value);
    setIsDirty(true);
  }

  function updatePresetName(value: string) {
    setPresetName(value);
  }

  function selectPreset(id: string) {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;

    setActiveId(id);
    setInstructions(preset.content);
    setPresetName(preset.name);
    setIsDirty(false);
    saveInstructionPresets({ presets, activeId: id });
  }

  function startNewDraft() {
    setActiveId(null);
    setInstructions("");
    setPresetName("");
    setIsDirty(false);
    saveInstructionPresets({ presets, activeId: null });
  }

  function commitPresetName() {
    if (!activeId || !activePreset) {
      return { ok: true as const };
    }

    const name = presetName.trim();
    if (!name) {
      setPresetName(activePreset.name);
      return { error: "Preset name cannot be empty." as const };
    }

    if (name === activePreset.name) {
      return { ok: true as const };
    }

    const nextPresets = presets.map((preset) =>
      preset.id === activeId
        ? { ...preset, name, updatedAt: Date.now() }
        : preset,
    );
    persist(nextPresets, activeId);
    return { ok: true as const };
  }

  function savePreset() {
    const content = instructions.trim();
    if (!content) return { error: "Instructions cannot be empty." as const };

    if (activeId) {
      const name = presetName.trim();
      if (!name) {
        return { error: "Preset name cannot be empty." as const };
      }

      const nextPresets = presets.map((preset) =>
        preset.id === activeId
          ? { ...preset, name, content, updatedAt: Date.now() }
          : preset,
      );
      persist(nextPresets, activeId);
      setIsDirty(false);
      return { ok: true as const };
    }

    const name = presetName.trim();
    if (!name) {
      return { error: "Enter a name to save this preset." as const };
    }

    const preset: InstructionPreset = {
      id: createPresetId(),
      name,
      content,
      updatedAt: Date.now(),
    };

    const nextPresets = [...presets, preset];
    persist(nextPresets, preset.id);
    setIsDirty(false);
    return { ok: true as const };
  }

  function deleteActivePreset() {
    if (!activeId) return { error: "Nothing to delete." as const };

    const nextPresets = presets.filter((preset) => preset.id !== activeId);
    if (nextPresets.length === 0) {
      return { error: "Keep at least one saved preset." as const };
    }

    const nextActive = nextPresets[0]!;
    persist(nextPresets, nextActive.id);
    setInstructions(nextActive.content);
    setPresetName(nextActive.name);
    setIsDirty(false);
    return { ok: true as const };
  }

  return {
    ready,
    presets,
    activeId,
    activePreset,
    isDraft,
    isDirty,
    instructions,
    presetName,
    updateInstructions,
    updatePresetName,
    commitPresetName,
    selectPreset,
    startNewDraft,
    savePreset,
    deleteActivePreset,
  };
}
