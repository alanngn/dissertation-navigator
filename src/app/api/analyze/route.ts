import { NextRequest, NextResponse } from "next/server";
import { analyzeDocumentWithAgent } from "@/lib/agent-analysis";
import { extractDocumentText } from "@/lib/document";
import { DEFAULT_MODEL, getModelById } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel rejects request bodies above ~4.5 MB before our handler runs. */
const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const instructions = formData.get("instructions");
    const model = (formData.get("model") as string | null) ?? DEFAULT_MODEL;

    if (typeof instructions !== "string" || !instructions.trim()) {
      return NextResponse.json(
        { error: "Instructions are required." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A document file is required." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 4 MB limit (Vercel max request size is ~4.5 MB)." },
        { status: 400 },
      );
    }

    if (!getModelById(model)) {
      return NextResponse.json({ error: "Invalid model." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const documentText = await extractDocumentText(
      buffer,
      file.name,
      file.type,
    );

    if (!documentText) {
      return NextResponse.json(
        { error: "No readable text found in the document." },
        { status: 400 },
      );
    }

    const analysis = await analyzeDocumentWithAgent(
      documentText,
      file.name,
      instructions,
      model,
    );

    return NextResponse.json({
      output: analysis.rawOutput,
      summary: analysis.summary,
      findings: analysis.findings,
      documentChars: documentText.length,
      usage: analysis.usage,
    });
  } catch (error) {
    console.error("Analysis failed:", error);
    const message =
      error instanceof Error ? error.message : "Analysis request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
