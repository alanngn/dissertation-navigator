export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function presetDescription(content: string, maxLength = 80): string {
  const line = content.split("\n").find((l) => l.trim())?.trim() ?? "";
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength - 1)}…`;
}
