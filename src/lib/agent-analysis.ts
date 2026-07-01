import OpenAI from "openai";
import {
  STRUCTURED_OUTPUT_SYSTEM_APPENDIX,
  parseStructuredAgentOutput,
  type AgentFinding,
} from "@/lib/audit-types";
import { formatAnalysisError } from "@/lib/analysis-errors";
import { calculateCost } from "@/lib/pricing";
import { DEFAULT_MODEL, getModelById } from "@/lib/models";

export type AgentAnalysisResult = {
  summary: string;
  findings: AgentFinding[];
  rawOutput: string;
  usage: ReturnType<typeof calculateCost>;
};

export async function analyzeDocumentWithAgent(
  documentText: string,
  fileName: string,
  instructions: string,
  model: string = DEFAULT_MODEL,
): Promise<AgentAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!getModelById(model)) {
    throw new Error("Invalid model.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a validation agent. Follow the user's instructions precisely when analyzing the provided document. Be thorough, structured, and cite specific evidence from the document when relevant." +
            STRUCTURED_OUTPUT_SYSTEM_APPENDIX,
        },
        {
          role: "user",
          content: `${instructions.trim()}\n\n---\n\nDOCUMENT (${fileName}):\n\n${documentText}`,
        },
      ],
      response_format: { type: "json_object" },
    });
  } catch (error) {
    throw new Error(formatAnalysisError(error));
  }

  const rawOutput = completion.choices[0]?.message?.content?.trim() ?? "";
  const structured = parseStructuredAgentOutput(rawOutput);
  const usage = completion.usage;

  const tokenUsage = {
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
  };

  return {
    summary: structured.summary,
    findings: structured.findings,
    rawOutput,
    usage: calculateCost(model, tokenUsage),
  };
}
