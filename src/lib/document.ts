import { extractText, getDocumentProxy } from "unpdf";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "xml",
  "html",
  "htm",
]);

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1)! : "";
}

export async function extractDocumentText(
  buffer: Buffer,
  filename: string,
  contentType?: string,
): Promise<string> {
  const extension = getExtension(filename);
  const isPdf =
    extension === "pdf" || contentType?.toLowerCase().includes("pdf");

  if (isPdf) {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text.trim();
  }

  if (TEXT_EXTENSIONS.has(extension) || contentType?.startsWith("text/")) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(
    `Unsupported file type "${extension || contentType || "unknown"}". Upload PDF or plain-text formats (.txt, .md, .csv, .json).`,
  );
}
