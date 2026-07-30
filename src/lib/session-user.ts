const SELECTED_USER_ID_KEY = "validation-harness:selected-user-id";
const LEGACY_PRESETS_KEY = "validation-harness:instruction-presets";

export function formatSessionUserName(userId: string): string {
  return `Session ${userId.slice(0, 8)}`;
}

type ClerkUserLike = {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
};

export function getClerkDisplayName(user: ClerkUserLike): string {
  const fullName = user.fullName?.trim();
  if (fullName) return fullName;

  const parts = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim());
  if (parts.length > 0) return parts.join(" ");

  const username = user.username?.trim();
  if (username) return username;

  const email = user.primaryEmailAddress?.emailAddress?.trim();
  if (email) return email.split("@")[0] ?? email;

  return formatSessionUserName(user.id);
}

export function getClerkEmail(user: ClerkUserLike): string | undefined {
  return user.primaryEmailAddress?.emailAddress?.trim() || undefined;
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
