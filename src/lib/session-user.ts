const SESSION_USER_ID_KEY = "validation-harness:session-user-id";
const SELECTED_USER_ID_KEY = "validation-harness:selected-user-id";
const LEGACY_PRESETS_KEY = "validation-harness:instruction-presets";

export function createSessionUserId(): string {
  return crypto.randomUUID();
}

export function formatSessionUserName(userId: string): string {
  return `Session ${userId.slice(0, 8)}`;
}

export function getSessionUserIdFromLocal(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_USER_ID_KEY);
}

export function setSessionUserIdInLocal(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_USER_ID_KEY, userId);
}

export function getSelectedUserIdFromLocal(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_USER_ID_KEY);
}

export function setSelectedUserIdInLocal(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELECTED_USER_ID_KEY, userId);
}

export function getLegacyPresetsKey(): string {
  return LEGACY_PRESETS_KEY;
}
