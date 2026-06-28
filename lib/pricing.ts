// ============================================================
// Aegis pricing — USD per 1M tokens, for cost estimation.
// Values approximate public list prices; not guaranteed exact.
// ============================================================

interface Price {
  input: number; // per 1M tokens
  output: number; // per 1M tokens
}

// Matched by substring (longest match wins).
const PRICE_TABLE: { match: string; price: Price }[] = [
  // OpenAI
  { match: "o3-mini", price: { input: 1.1, output: 4.4 } },
  { match: "o1-mini", price: { input: 1.1, output: 4.4 } },
  { match: "o1", price: { input: 15, output: 60 } },
  { match: "gpt-4.1-mini", price: { input: 0.4, output: 1.6 } },
  { match: "gpt-4.1", price: { input: 2, output: 8 } },
  { match: "gpt-4o-mini", price: { input: 0.15, output: 0.6 } },
  { match: "gpt-4o", price: { input: 2.5, output: 10 } },
  // Anthropic
  { match: "claude-opus-4", price: { input: 15, output: 75 } },
  { match: "claude-sonnet-4", price: { input: 3, output: 15 } },
  { match: "claude-3-7-sonnet", price: { input: 3, output: 15 } },
  { match: "claude-3-5-sonnet", price: { input: 3, output: 15 } },
  { match: "claude-3-5-haiku", price: { input: 0.8, output: 4 } },
  { match: "claude-3-opus", price: { input: 15, output: 75 } },
  // Google
  { match: "gemini-2.5-pro", price: { input: 1.25, output: 10 } },
  { match: "gemini-2.5-flash", price: { input: 0.3, output: 2.5 } },
  { match: "gemini-2.0-flash", price: { input: 0.1, output: 0.4 } },
  { match: "gemini-1.5-pro", price: { input: 1.25, output: 5 } },
  { match: "gemini-1.5-flash", price: { input: 0.075, output: 0.3 } },
  // DeepSeek
  { match: "deepseek-reasoner", price: { input: 0.55, output: 2.19 } },
  { match: "deepseek-chat", price: { input: 0.27, output: 1.1 } },
  // Groq
  { match: "llama-3.3-70b", price: { input: 0.59, output: 0.79 } },
  { match: "llama-3.1-8b", price: { input: 0.05, output: 0.08 } },
  // Mistral
  { match: "mistral-large", price: { input: 2, output: 6 } },
  { match: "mistral-small", price: { input: 0.2, output: 0.6 } },
  { match: "codestral", price: { input: 0.3, output: 0.9 } },
  // Moonshot
  { match: "moonshot-v1-8k", price: { input: 1.4, output: 1.4 } },
  { match: "moonshot-v1-32k", price: { input: 2.8, output: 2.8 } },
  { match: "moonshot-v1-128k", price: { input: 5.6, output: 5.6 } },
  { match: "kimi-latest", price: { input: 1.2, output: 1.2 } },
  // Zhipu
  { match: "glm-4-plus", price: { input: 0.7, output: 0.7 } },
  { match: "glm-4-flash", price: { input: 0, output: 0 } },
  { match: "glm-4-air", price: { input: 0.1, output: 0.1 } },
  // OpenRouter passthroughs
  { match: "anthropic/claude-3.5-sonnet", price: { input: 3, output: 15 } },
  { match: "openai/gpt-4o", price: { input: 2.5, output: 10 } },
  { match: "google/gemini-2.0-flash-001", price: { input: 0.1, output: 0.4 } },
  { match: "deepseek/deepseek-chat", price: { input: 0.27, output: 1.1 } },
  { match: "meta-llama/llama-3.3-70b-instruct", price: { input: 0.59, output: 0.79 } },
];

const FALLBACK: Price = { input: 0.5, output: 1.5 };

export function getPrice(model: string): Price {
  const lower = model.toLowerCase();
  let best: Price | null = null;
  let bestLen = 0;
  for (const entry of PRICE_TABLE) {
    if (lower.includes(entry.match) && entry.match.length > bestLen) {
      best = entry.price;
      bestLen = entry.match.length;
    }
  }
  return best ?? FALLBACK;
}

export function estimateCost(model: string, prompt: number, completion: number): number {
  const p = getPrice(model);
  return (prompt / 1_000_000) * p.input + (completion / 1_000_000) * p.output;
}
