import { parseApiResponse } from "@/lib/parse-api-response";
import type { PlatformSettings } from "@/lib/platform-settings";

export type PlatformSettingsApiResponse = PlatformSettings & {
  source?: "database" | "default" | "unconfigured";
  error?: string;
};

export async function fetchPlatformSettingsFromApi(): Promise<PlatformSettingsApiResponse> {
  const response = await fetch("/api/platform-settings");
  return parseApiResponse<PlatformSettingsApiResponse>(response);
}

export async function savePlatformSettingsToApi(
  settings: PlatformSettings,
): Promise<boolean> {
  const response = await fetch("/api/platform-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });

  if (response.status === 503) {
    return false;
  }

  if (!response.ok) {
    const data = await parseApiResponse<{ error?: string }>(response);
    throw new Error(data.error ?? "Failed to save platform settings.");
  }

  return true;
}
