"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPresetsFromApi,
  savePresetsToApi,
} from "@/lib/instruction-presets-api";
import {
  createPresetId,
  DEFAULT_INSTRUCTIONS,
  loadInstructionPresetsFromLocal,
  saveInstructionPresets,
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

function applyStoreToState(
  store: InstructionPresetStore,
  setters: {
    setPresets: (presets: InstructionPreset[]) => void;
    setActiveId: (activeId: string | null) => void;
    setInstructions: (instructions: string) => void;
    setPresetName: (name: string) => void;
  },
) {
  const active = store.presets.find((preset) => preset.id === store.activeId);

  setters.setPresets(store.presets);
  setters.setActiveId(store.activeId);
  setters.setInstructions(active?.content ?? DEFAULT_INSTRUCTIONS);
  setters.setPresetName(active?.name ?? "");
}

export function useInstructionPresets() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [presets, setPresets] = useState<InstructionPreset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [presetName, setPresetName] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [usingDatabase, setUsingDatabase] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [switchingUser, setSwitchingUser] = useState(false);

  const loadPresetsForUser = useCallback(async (userId: string) => {
    const setters = {
      setPresets,
      setActiveId,
      setInstructions,
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

      await loadPresetsForUser(nextSelectedUserId);

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
      saveUserId: string,
      nextPresets: InstructionPreset[],
      nextActiveId: string | null,
    ) => {
      const store: InstructionPresetStore = {
        presets: nextPresets,
        activeId: nextActiveId,
      };

      setPresets(nextPresets);
      setActiveId(nextActiveId);

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
        await loadPresetsForUser(userId);
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
  const canEditPresets = isViewingSessionUser && sessionUserId !== null;

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

    if (canEditPresets && sessionUserId) {
      void persist(sessionUserId, presets, id);
    }
  }

  function startNewDraft() {
    if (!canEditPresets) {
      return { error: "Switch to your session to create presets." as const };
    }

    setActiveId(null);
    setInstructions("");
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

  function savePreset() {
    if (!canEditPresets || !sessionUserId) {
      return {
        error: "Switch to your session to save presets.",
      } as const;
    }

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
      void persist(sessionUserId, nextPresets, activeId);
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
    void persist(sessionUserId, nextPresets, preset.id);
    setIsDirty(false);
    return { ok: true as const };
  }

  function deleteActivePreset() {
    if (!canEditPresets || !sessionUserId) {
      return { error: "Switch to your session to delete presets." as const };
    }

    if (!activeId) {
      return { error: "Nothing to delete." as const };
    }

    const nextPresets = presets.filter((preset) => preset.id !== activeId);
    if (nextPresets.length === 0) {
      return { error: "Keep at least one saved preset." as const };
    }

    const nextActive = nextPresets[0]!;
    void persist(sessionUserId, nextPresets, nextActive.id);
    setInstructions(nextActive.content);
    setPresetName(nextActive.name);
    setIsDirty(false);
    return { ok: true as const };
  }

  return {
    ready,
    usingDatabase,
    syncError,
    switchingUser,
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
