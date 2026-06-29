import mammoth from "mammoth";
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

function isDocx(extension: string, contentType?: string): boolean {
  const type = contentType?.toLowerCase() ?? "";
  return (
    extension === "docx" ||
    type.includes("wordprocessingml") ||
    type.includes("officedocument.wordprocessingml")
  );
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

  if (isDocx(extension, contentType)) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value.trim();
  }

  if (extension === "doc" || contentType?.toLowerCase().includes("msword")) {
    throw new Error(
      'Legacy Word ".doc" files are not supported. Save the file as ".docx" and upload again.',
    );
  }

  if (TEXT_EXTENSIONS.has(extension) || contentType?.startsWith("text/")) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(
    `Unsupported file type "${extension || contentType || "unknown"}". Upload PDF, DOCX, or plain-text formats (.txt, .md, .csv, .json).`,
  );
}
