import { getModelById, type ModelPricing } from "./models";

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type UsageCost = TokenUsage & {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  modelId: string;
};

export function calculateCost(
  modelId: string,
  usage: TokenUsage,
  pricingOverride?: ModelPricing,
): UsageCost {
  const pricing = pricingOverride ?? getModelById(modelId)?.pricing;

  if (!pricing) {
    return {
      ...usage,
      modelId,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };
  }

  const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputPer1M;

  return {
    ...usage,
    modelId,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

export function formatUsd(amount: number): string {
  if (amount < 0.0001 && amount > 0) {
    return "< $0.0001";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}
