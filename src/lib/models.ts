export type ModelPricing = {
  inputPer1M: number;
  outputPer1M: number;
};

export type ModelOption = {
  id: string;
  label: string;
  pricing: ModelPricing;
  contextLength: number;
  maxOutputTokens: number;
  knowledgeCutoff: string;
};

export const MODELS: ModelOption[] = [
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    pricing: { inputPer1M: 5, outputPer1M: 30 },
    contextLength: 1_050_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "Dec 1, 2025",
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    pricing: { inputPer1M: 2.5, outputPer1M: 15 },
    contextLength: 1_050_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "Aug 31, 2025",
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    pricing: { inputPer1M: 0.75, outputPer1M: 4.5 },
    contextLength: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "Aug 31, 2025",
  },
];

export const DEFAULT_MODEL = "gpt-5.4-mini";

export function getModelById(id: string): ModelOption | undefined {
  return MODELS.find((model) => model.id === id);
}
