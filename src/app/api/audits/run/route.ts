import { NextRequest, NextResponse } from "next/server";
import { analyzeDocumentWithAgent } from "@/lib/agent-analysis";
import {
  formatAnalysisError,
  summarizeAuditFailures,
} from "@/lib/analysis-errors";
import { type AgentAuditResult } from "@/lib/audit-types";
import { isDatabaseConfigured } from "@/lib/db";
import { saveAuditRun } from "@/lib/audits-db";
import { extractDocumentText } from "@/lib/document";
import { DEFAULT_MODEL } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_SIZE = 4 * 1024 * 1024;

type AgentConfig = {
  id: string;
  name: string;
  instructions: string;
};

function parseAgents(raw: FormDataEntryValue | null): AgentConfig[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const agents: AgentConfig[] = [];
    for (const item of parsed) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof (item as AgentConfig).id !== "string" ||
        typeof (item as AgentConfig).name !== "string" ||
        typeof (item as AgentConfig).instructions !== "string"
      ) {
        return null;
      }
      const agent = item as AgentConfig;
      if (!agent.instructions.trim()) return null;
      agents.push({
        id: agent.id,
        name: agent.name,
        instructions: agent.instructions.trim(),
      });
    }
    return agents.length > 0 ? agents : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 },
      );
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Database is not configured. Audits cannot be saved." },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const agents = parseAgents(formData.get("agents"));
    const userId = (formData.get("userId") as string | null)?.trim() || null;
    const model = (formData.get("model") as string | null) ?? DEFAULT_MODEL;

    if (!agents) {
      return NextResponse.json(
        { error: "At least one agent configuration is required." },
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
        {
          error:
            "File exceeds the 4 MB limit (Vercel max request size is ~4.5 MB).",
        },
        { status: 400 },
      );
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

    const results = await Promise.allSettled(
      agents.map(async (agent): Promise<AgentAuditResult> => {
        const analysis = await analyzeDocumentWithAgent(
          documentText,
          file.name,
          agent.instructions,
          model,
        );

        return {
          agentId: agent.id,
          agentName: agent.name,
          status: "completed",
          summary: analysis.summary,
          findings: analysis.findings,
          rawOutput: analysis.rawOutput,
        };
      }),
    );

    const agentResults: AgentAuditResult[] = results.map((result, index) => {
      const agent = agents[index]!;
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        agentId: agent.id,
        agentName: agent.name,
        status: "failed",
        summary: "",
        findings: [],
        rawOutput: "",
        error:
          result.reason instanceof Error
            ? result.reason.message
            : formatAnalysisError(result.reason),
      };
    });

    const succeeded = agentResults.filter((r) => r.status === "completed");
    if (succeeded.length === 0) {
      const message = summarizeAuditFailures(agentResults);
      console.error("Audit run: all agents failed", {
        fileName: file.name,
        agentCount: agents.length,
        failures: agentResults
          .filter((result) => result.status === "failed")
          .map((result) => ({
            agent: result.agentName,
            error: result.error,
          })),
      });
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const report = await saveAuditRun({
      userId,
      fileName: file.name,
      agentResults,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Audit run failed:", error);
    const message =
      error instanceof Error ? error.message : "Audit request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
