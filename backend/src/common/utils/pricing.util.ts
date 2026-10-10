/**
 * Pricing rates per 1,000,000 tokens in USD.
 */
interface ModelRate {
  promptPerMillion: number;
  completionPerMillion: number;
}

const MODEL_PRICING_TABLE: Record<string, ModelRate> = {
  // Google Gemini
  'gemini-1.5-flash': { promptPerMillion: 0.075, completionPerMillion: 0.30 },
  'gemini-1.5-pro': { promptPerMillion: 1.25, completionPerMillion: 5.00 },
  'gemini-2.0-flash': { promptPerMillion: 0.10, completionPerMillion: 0.40 },
  'text-embedding-004': { promptPerMillion: 0.02, completionPerMillion: 0.0 },

  // OpenAI
  'gpt-4o': { promptPerMillion: 2.50, completionPerMillion: 10.00 },
  'gpt-4o-mini': { promptPerMillion: 0.15, completionPerMillion: 0.60 },
  'gpt-4-turbo': { promptPerMillion: 10.00, completionPerMillion: 30.00 },
  'o1-preview': { promptPerMillion: 15.00, completionPerMillion: 60.00 },
  'o1-mini': { promptPerMillion: 3.00, completionPerMillion: 12.00 },

  // Anthropic
  'claude-3-5-sonnet': { promptPerMillion: 3.00, completionPerMillion: 15.00 },
  'claude-3-haiku': { promptPerMillion: 0.25, completionPerMillion: 1.25 },
  'claude-3-opus': { promptPerMillion: 15.00, completionPerMillion: 75.00 },

  // Open-source / default fallback
  'llama-3.3-70b': { promptPerMillion: 0.60, completionPerMillion: 0.80 },
  'default': { promptPerMillion: 1.00, completionPerMillion: 3.00 },
};

/**
 * Calculates estimated cost for token usage.
 */
export function calculateEstimatedCostUsd(
  model: string | undefined,
  promptTokens = 0,
  completionTokens = 0,
): number {
  const normalizedModel = (model || '').toLowerCase().trim();

  // Find exact or partial match in pricing table
  let rate = MODEL_PRICING_TABLE[normalizedModel];
  if (!rate) {
    const matchedKey = Object.keys(MODEL_PRICING_TABLE).find((k) =>
      normalizedModel.includes(k),
    );
    rate = matchedKey ? MODEL_PRICING_TABLE[matchedKey] : MODEL_PRICING_TABLE['default'];
  }

  const promptCost = (promptTokens / 1_000_000) * rate.promptPerMillion;
  const completionCost = (completionTokens / 1_000_000) * rate.completionPerMillion;
  const totalCost = promptCost + completionCost;

  // Round to 6 decimal places (micro-cents)
  return Math.round(totalCost * 1_000_000) / 1_000_000;
}
