import { parseApiResponse } from "@/lib/parse-api-response";
import type { UserSummary } from "@/lib/users-db";

export type UsersApiResponse = {
  users: UserSummary[];
  error?: string;
};

export type EnsureUserResponse = UserSummary & {
  error?: string;
};

export async function fetchUsersFromApi(): Promise<UserSummary[]> {
  const response = await fetch("/api/users");
  const data = await parseApiResponse<UsersApiResponse>(response);

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load users.");
  }

  return data.users;
}

export async function ensureUserOnApi(
  id: string,
  name?: string,
): Promise<UserSummary> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name }),
  });

  const data = await parseApiResponse<EnsureUserResponse>(response);

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to register user.");
  }

  return data;
}
