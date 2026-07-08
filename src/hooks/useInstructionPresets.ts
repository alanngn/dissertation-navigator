"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPresetsFromApi,
  savePresetsToApi,
} from "@/lib/instruction-presets-api";
import {
  composeInstructions,
  createEmptyRule,
  createPresetId,
  loadInstructionPresetsFromLocal,
  saveInstructionPresets,
  type AgentRule,
  type AgentRulePriority,
  type InstructionPreset,
  type InstructionPresetStore,
} from "@/lib/instruction-presets";
import {
  createSessionUserId,
  formatSessionUserName,
  getSelectedUserIdFromLocal,
  getSessionUserIdFromLocal,
  setSelectedUserIdInLocal,
  setSessionUserIdInLocal,
} from "@/lib/session-user";
import {
  ensureUserOnApi,
  fetchUsersFromApi,
} from "@/lib/users-api";
import type { UserSummary } from "@/lib/users-db";
import { GLOBAL_WORKSPACE_USER_ID } from "@/lib/seed-agents";

function applyStoreToState(
  store: InstructionPresetStore,
  setters: {
    setPresets: (presets: InstructionPreset[]) => void;
    setActiveId: (activeId: string | null) => void;
    setPurpose: (purpose: string) => void;
    setBusinessFunction: (businessFunction: string) => void;
    setRules: (rules: AgentRule[]) => void;
    setPresetName: (name: string) => void;
  },
) {
  const active = store.presets.find((preset) => preset.id === store.activeId);

  setters.setPresets(store.presets);
  setters.setActiveId(store.activeId);
  setters.setPurpose(active?.purpose ?? "");
  setters.setBusinessFunction(active?.businessFunction ?? "");
  setters.setRules(active?.rules ?? []);
  setters.setPresetName(active?.name ?? "");
}

export function useInstructionPresets() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [presets, setPresets] = useState<InstructionPreset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [businessFunction, setBusinessFunction] = useState("");
  const [rules, setRules] = useState<AgentRule[]>([]);
  const [presetName, setPresetName] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [usingDatabase, setUsingDatabase] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [switchingUser, setSwitchingUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingCountRef = useRef(0);

  const loadPresetsForUser = useCallback(async (userId: string) => {
    const setters = {
      setPresets,
      setActiveId,
      setPurpose,
      setBusinessFunction,
      setRules,
      setPresetName,
    };

    try {
      const apiStore = await fetchPresetsFromApi(userId);

      if (apiStore.error) {
        throw new Error(apiStore.error);
      }

      if (apiStore.presets.length > 0) {
        applyStoreToState(apiStore, setters);
        setUsingDatabase(apiStore.source === "database");
        setSyncError(null);
        setIsDirty(false);
        return;
      }

      const localStore = loadInstructionPresetsFromLocal(userId);
      applyStoreToState(localStore, setters);
      setIsDirty(false);

      if (apiStore.source !== "unconfigured") {
        try {
          await savePresetsToApi(userId, localStore);
          setUsingDatabase(true);
          setSyncError(null);
        } catch (error) {
          console.warn("Could not migrate local presets to database:", error);
          setUsingDatabase(false);
          setSyncError(
            error instanceof Error
              ? error.message
              : "Could not sync presets to database.",
          );
        }
      } else {
        setUsingDatabase(false);
        setSyncError(null);
      }
    } catch (error) {
      console.warn("Falling back to local presets:", error);
      applyStoreToState(loadInstructionPresetsFromLocal(userId), setters);
      setUsingDatabase(false);
      setSyncError(
        error instanceof Error
          ? error.message
          : "Database unavailable — using local storage.",
      );
      setIsDirty(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let nextSessionUserId = getSessionUserIdFromLocal();

      if (!nextSessionUserId) {
        nextSessionUserId = createSessionUserId();
        setSessionUserIdInLocal(nextSessionUserId);
      }

      if (cancelled) return;

      setSessionUserId(nextSessionUserId);

      let nextUsers: UserSummary[] = [];

      try {
        await ensureUserOnApi(
          nextSessionUserId,
          formatSessionUserName(nextSessionUserId),
        );
        nextUsers = await fetchUsersFromApi();
        setSyncError(null);
      } catch (error) {
        console.warn("User setup failed, continuing with local session:", error);
        setSyncError(
          error instanceof Error
            ? error.message
            : "Database unavailable — using local storage.",
        );
        nextUsers = [
          {
            id: nextSessionUserId,
            name: formatSessionUserName(nextSessionUserId),
            email: `session-${nextSessionUserId}@local`,
            role: "user",
          },
        ];
      }

      if (cancelled) return;

      setUsers(nextUsers);

      const storedSelection = getSelectedUserIdFromLocal();
      const nextSelectedUserId =
        storedSelection &&
        nextUsers.some((user) => user.id === storedSelection)
          ? storedSelection
          : nextSessionUserId;

      setSelectedUserId(nextSelectedUserId);
      setSelectedUserIdInLocal(nextSelectedUserId);

      // Agents are global for now: every session reads from and writes to the
      // shared workspace, so seeded agents and edits are visible to everyone.
      await loadPresetsForUser(GLOBAL_WORKSPACE_USER_ID);

      if (!cancelled) {
        setReady(true);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [loadPresetsForUser]);

  const persist = useCallback(
    async (
      _saveUserId: string,
      nextPresets: InstructionPreset[],
      nextActiveId: string | null,
    ) => {
      // Always persist to the shared workspace so edits are global.
      const saveUserId = GLOBAL_WORKSPACE_USER_ID;
      const store: InstructionPresetStore = {
        presets: nextPresets,
        activeId: nextActiveId,
      };

      setPresets(nextPresets);
      setActiveId(nextActiveId);

      savingCountRef.current += 1;
      setSaving(true);

      try {
        try {
          const savedToDatabase = await savePresetsToApi(saveUserId, store);
          if (savedToDatabase) {
            setUsingDatabase(true);
            setSyncError(null);
            saveInstructionPresets(store, saveUserId);
            return;
          }
        } catch (error) {
          console.warn("Database save failed, using local storage:", error);
          setSyncError(
            error instanceof Error
              ? error.message
              : "Could not save presets to database.",
          );
        }

        setUsingDatabase(false);
        saveInstructionPresets(store, saveUserId);
      } finally {
        savingCountRef.current -= 1;
        if (savingCountRef.current === 0) {
          setSaving(false);
        }
      }
    },
    [],
  );

  const selectUser = useCallback(
    async (userId: string) => {
      if (!userId || userId === selectedUserId) return;

      setSwitchingUser(true);
      setSelectedUserId(userId);
      setSelectedUserIdInLocal(userId);

      try {
        // Agents are global for now, so always load the shared workspace
        // regardless of which user is selected for viewing.
        await loadPresetsForUser(GLOBAL_WORKSPACE_USER_ID);
      } finally {
        setSwitchingUser(false);
      }
    },
    [loadPresetsForUser, selectedUserId],
  );

  const activePreset = presets.find((preset) => preset.id === activeId) ?? null;
  const isDraft = activeId === null;
  const isViewingSessionUser =
    sessionUserId !== null && selectedUserId === sessionUserId;
  // Agents live in a shared workspace, so any signed-in session can edit them.
  const canEditPresets = sessionUserId !== null;

  const instructions = composeInstructions(purpose, businessFunction, rules);

  function updatePurpose(value: string) {
    setPurpose(value);
    setIsDirty(true);
  }

  function updateBusinessFunction(value: string) {
    setBusinessFunction(value);
    setIsDirty(true);
  }

  function addRule() {
    setRules((current) => [...current, createEmptyRule()]);
    setIsDirty(true);
  }

  function updateRule(index: number, value: string) {
    setRules((current) =>
      current.map((rule, i) =>
        i === index ? { ...rule, text: value } : rule,
      ),
    );
    setIsDirty(true);
  }

  function updateRulePriority(index: number, priority: AgentRulePriority) {
    setRules((current) =>
      current.map((rule, i) =>
        i === index ? { ...rule, priority } : rule,
      ),
    );
    setIsDirty(true);
  }

  function removeRule(index: number) {
    setRules((current) => current.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  /** @deprecated Prefer the structured updaters (purpose/businessFunction/rules). */
  function updateInstructions(value: string) {
    setPurpose(value);
    setBusinessFunction("");
    setRules([]);
    setIsDirty(true);
  }

  function updatePresetName(value: string) {
    setPresetName(value);
  }

  function applyPresetToState(preset: InstructionPreset) {
    setPurpose(preset.purpose);
    setBusinessFunction(preset.businessFunction);
    setRules(preset.rules);
    setPresetName(preset.name);
    setIsDirty(false);
  }

  function selectPreset(id: string) {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;

    setActiveId(id);
    applyPresetToState(preset);

    if (canEditPresets && sessionUserId) {
      void persist(sessionUserId, presets, id);
    }
  }

  function startNewDraft() {
    if (!canEditPresets) {
      return { error: "Switch to your session to create presets." as const };
    }

    setActiveId(null);
    setPurpose("");
    setBusinessFunction("");
    setRules([]);
    setPresetName("");
    setIsDirty(false);

    if (sessionUserId) {
      void persist(sessionUserId, presets, null);
    }

    return { ok: true as const };
  }

  function commitPresetName() {
    if (!activeId || !activePreset || !canEditPresets || !sessionUserId) {
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
    void persist(sessionUserId, nextPresets, activeId);
    return { ok: true as const };
  }

  async function savePreset() {
    if (!canEditPresets || !sessionUserId) {
      return {
        error: "Switch to your session to save presets.",
      } as const;
    }

    const trimmedRules = rules
      .map((rule) => ({
        text: rule.text.trim(),
        priority: rule.priority,
      }))
      .filter((rule) => rule.text.length > 0);
    const content = composeInstructions(
      purpose,
      businessFunction,
      trimmedRules,
    ).trim();
    if (!content) {
      return {
        error: "Add a purpose, business function, or at least one rule." as const,
      };
    }

    if (activeId) {
      const name = presetName.trim();
      if (!name) {
        return { error: "Preset name cannot be empty." as const };
      }

      const nextPresets = presets.map((preset) =>
        preset.id === activeId
          ? {
              ...preset,
              name,
              purpose: purpose.trim(),
              businessFunction: businessFunction.trim(),
              rules: trimmedRules,
              content,
              updatedAt: Date.now(),
            }
          : preset,
      );
      await persist(sessionUserId, nextPresets, activeId);
      setIsDirty(false);
      return { ok: true as const, id: activeId };
    }

    const name = presetName.trim();
    if (!name) {
      return { error: "Enter a name to save this preset." as const };
    }

    const preset: InstructionPreset = {
      id: createPresetId(),
      name,
      purpose: purpose.trim(),
      businessFunction: businessFunction.trim(),
      rules: trimmedRules,
      content,
      updatedAt: Date.now(),
    };

    const nextPresets = [...presets, preset];
    await persist(sessionUserId, nextPresets, preset.id);
    setIsDirty(false);
    return { ok: true as const, id: preset.id };
  }

  function deleteActivePreset() {
    if (!activeId) {
      return { error: "Nothing to delete." as const };
    }
    return deletePresetById(activeId);
  }

  function deletePresetById(id: string) {
    if (!canEditPresets || !sessionUserId) {
      return { error: "Switch to your session to delete presets." as const };
    }

    const nextPresets = presets.filter((preset) => preset.id !== id);
    if (nextPresets.length === 0) {
      return { error: "Keep at least one saved agent." as const };
    }

    const wasActive = activeId === id;
    const nextActive = wasActive
      ? nextPresets[0]!
      : (presets.find((p) => p.id === activeId) ?? nextPresets[0]!);

    void persist(sessionUserId, nextPresets, nextActive.id);

    if (wasActive) {
      applyPresetToState(nextActive);
    }

    return { ok: true as const };
  }

  function loadPresetForEditing(id: string) {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return { error: "Agent not found." as const };

    setActiveId(id);
    applyPresetToState(preset);

    if (canEditPresets && sessionUserId) {
      void persist(sessionUserId, presets, id);
    }

    return { ok: true as const };
  }

  return {
    ready,
    usingDatabase,
    syncError,
    switchingUser,
    saving,
    sessionUserId,
    selectedUserId,
    isViewingSessionUser,
    canEditPresets,
    users,
    selectUser,
    presets,
    activeId,
    activePreset,
    isDraft,
    isDirty,
    instructions,
    purpose,
    businessFunction,
    rules,
    presetName,
    updatePurpose,
    updateBusinessFunction,
    addRule,
    updateRule,
    updateRulePriority,
    removeRule,
    updateInstructions,
    updatePresetName,
    commitPresetName,
    selectPreset,
    startNewDraft,
    savePreset,
    deleteActivePreset,
    deletePresetById,
    loadPresetForEditing,
  };
}

export type UseInstructionPresetsReturn = ReturnType<
  typeof useInstructionPresets
>;
