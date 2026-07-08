"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPlatformSettingsFromApi,
  savePlatformSettingsToApi,
} from "@/lib/platform-settings-api";
import {
  createDefaultPlatformSettings,
  loadPlatformSettingsFromLocal,
  savePlatformSettingsToLocal,
  type PlatformSettings,
} from "@/lib/platform-settings";
import {
  createEmptyRule,
  type AgentRulePriority,
} from "@/lib/instruction-presets";

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(
    createDefaultPlatformSettings(),
  );
  const [ready, setReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [usingDatabase, setUsingDatabase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const apiSettings = await fetchPlatformSettingsFromApi();

        if (cancelled) return;

        if (apiSettings.error) {
          throw new Error(apiSettings.error);
        }

        if (apiSettings.source === "database") {
          setSettings(apiSettings);
          setUsingDatabase(true);
          setSyncError(null);
          setIsDirty(false);
          setReady(true);
          return;
        }

        const localSettings = loadPlatformSettingsFromLocal();
        setSettings(localSettings);
        setUsingDatabase(false);
        setSyncError(
          apiSettings.source === "unconfigured"
            ? "Database not configured — platform settings are stored locally."
            : null,
        );
        setIsDirty(false);
        setReady(true);
      } catch (error) {
        if (cancelled) return;
        const localSettings = loadPlatformSettingsFromLocal();
        setSettings(localSettings);
        setUsingDatabase(false);
        setSyncError(
          error instanceof Error
            ? error.message
            : "Failed to load platform settings.",
        );
        setReady(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const addRule = useCallback(() => {
    setSettings((current) => ({
      ...current,
      rules: [...current.rules, createEmptyRule("critical")],
    }));
    setIsDirty(true);
  }, []);

  const updateRule = useCallback((index: number, text: string) => {
    setSettings((current) => ({
      ...current,
      rules: current.rules.map((rule, i) =>
        i === index ? { ...rule, text } : rule,
      ),
    }));
    setIsDirty(true);
  }, []);

  const updateRulePriority = useCallback(
    (index: number, priority: AgentRulePriority) => {
      setSettings((current) => ({
        ...current,
        rules: current.rules.map((rule, i) =>
          i === index ? { ...rule, priority } : rule,
        ),
      }));
      setIsDirty(true);
    },
    [],
  );

  const removeRule = useCallback((index: number) => {
    setSettings((current) => ({
      ...current,
      rules: current.rules.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  const saveSettings = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setSyncError(null);

    const nextSettings: PlatformSettings = {
      ...settings,
      preamble: "",
      updatedAt: Date.now(),
    };

    try {
      const savedToDb = await savePlatformSettingsToApi(nextSettings);

      if (savedToDb) {
        setSettings(nextSettings);
        setUsingDatabase(true);
        setIsDirty(false);
        return true;
      }

      savePlatformSettingsToLocal(nextSettings);
      setSettings(nextSettings);
      setUsingDatabase(false);
      setIsDirty(false);
      return true;
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : "Failed to save platform settings.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return {
    settings,
    ready,
    isDirty,
    usingDatabase,
    saving,
    syncError,
    addRule,
    updateRule,
    updateRulePriority,
    removeRule,
    saveSettings,
  };
}

export type UsePlatformSettingsReturn = ReturnType<typeof usePlatformSettings>;
