import { parseApiResponse } from "@/lib/parse-api-response";
import type { InstructionPresetStore } from "@/lib/instruction-presets";

export type PresetsApiResponse = InstructionPresetStore & {
  source?: "database" | "empty" | "unconfigured";
  error?: string;
};

function presetsUrl(userId: string): string {
  return `/api/presets?userId=${encodeURIComponent(userId)}`;
}

export async function fetchPresetsFromApi(
  userId: string,
): Promise<PresetsApiResponse> {
  const response = await fetch(presetsUrl(userId));
  return parseApiResponse<PresetsApiResponse>(response);
}

export async function savePresetsToApi(
  userId: string,
  store: InstructionPresetStore,
): Promise<boolean> {
  const response = await fetch(presetsUrl(userId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store),
  });

  if (response.status === 503) {
    return false;
  }

  if (!response.ok) {
    const data = await parseApiResponse<{ error?: string }>(response);
    throw new Error(data.error ?? "Failed to save presets.");
  }

  return true;
}
