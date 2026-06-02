export async function parseApiResponse<T extends { error?: string }>(
  response: Response,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const body = await response.text();
  const isHtml = body.trimStart().startsWith("<");

  if (response.status === 413 || body.includes("FUNCTION_PAYLOAD_TOO_LARGE")) {
    throw new Error(
      "Request too large for Vercel (max ~4.5 MB). Use a smaller PDF or compress the file.",
    );
  }

  if (response.status === 504 || body.includes("Task timed out")) {
    throw new Error(
      "Analysis timed out on the server. Try a smaller document or a faster model.",
    );
  }

  if (isHtml) {
    throw new Error(
      `Server returned an error page (HTTP ${response.status}). This often means the function crashed or timed out in production. Redeploy after the latest fix, or check Vercel function logs.`,
    );
  }

  throw new Error(
    body.slice(0, 200) || `Request failed with status ${response.status}.`,
  );
}
