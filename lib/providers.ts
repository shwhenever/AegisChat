// ============================================================
// Aegis provider catalog — presets users can add with one click.
// Three engines: openai-compatible, anthropic, google.
// ============================================================

import type { Engine, ProviderConfig } from "./types";
import { nanoid } from "nanoid";

export interface ProviderPreset {
  id: string;
  name: string;
  engine: Engine;
  baseURL: string;
  models: string[];
  description: string;
  keyURL: string;
  docsURL: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    engine: "openai",
    baseURL: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini", "o1-mini"],
    description: "GPT-4o / o 系列官方接口",
    keyURL: "https://platform.openai.com/api-keys",
    docsURL: "https://platform.openai.com/docs",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    engine: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    models: [
      "claude-sonnet-4-5-20250929",
      "claude-opus-4-20250514",
      "claude-3-7-sonnet-latest",
      "claude-3-5-haiku-latest",
    ],
    description: "Claude 4 / 3.7 Sonnet 官方接口",
    keyURL: "https://console.anthropic.com/settings/keys",
    docsURL: "https://docs.anthropic.com",
  },
  {
    id: "google",
    name: "Google Gemini",
    engine: "google",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    description: "Gemini 2.5 / 2.0 / 1.5 系列",
    keyURL: "https://aistudio.google.com/app/apikey",
    docsURL: "https://ai.google.dev/docs",
  },
  {
    id: "deepseek",
    name: "DeepSeek 深度求索",
    engine: "openai",
    baseURL: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    description: "DeepSeek-V3 / R1，OpenAI 兼容",
    keyURL: "https://platform.deepseek.com/api_keys",
    docsURL: "https://platform.deepseek.com/docs",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    engine: "openai",
    baseURL: "https://openrouter.ai/api/v1",
    models: [
      "openrouter/auto",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "google/gemini-2.0-flash-001",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
    ],
    description: "聚合 300+ 模型，一个 Key 通吃",
    keyURL: "https://openrouter.ai/keys",
    docsURL: "https://openrouter.ai/docs",
  },
  {
    id: "groq",
    name: "Groq",
    engine: "openai",
    baseURL: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"],
    description: "超低延迟 Llama / DeepSeek 推理",
    keyURL: "https://console.groq.com/keys",
    docsURL: "https://console.groq.com/docs",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    engine: "openai",
    baseURL: "https://api.mistral.ai/v1",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    description: "欧洲开源模型，OpenAI 兼容",
    keyURL: "https://console.mistral.ai/api-keys",
    docsURL: "https://docs.mistral.ai",
  },
  {
    id: "moonshot",
    name: "Moonshot Kimi",
    engine: "openai",
    baseURL: "https://api.moonshot.cn/v1",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k", "kimi-latest"],
    description: "Kimi 长上下文，OpenAI 兼容",
    keyURL: "https://platform.moonshot.cn/console/api-keys",
    docsURL: "https://platform.moonshot.cn/docs",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    engine: "openai",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-plus", "glm-4-flash", "glm-4-air"],
    description: "智谱 GLM-4 系列，OpenAI 兼容",
    keyURL: "https://open.bigmodel.cn/usercenter/apikeys",
    docsURL: "https://open.bigmodel.cn/dev/api",
  },
  {
    id: "ollama",
    name: "Ollama (本地)",
    engine: "openai",
    baseURL: "http://localhost:11434/v1",
    models: ["llama3.2", "qwen2.5", "deepseek-r1"],
    description: "本地私有部署，无需 Key",
    keyURL: "https://ollama.com",
    docsURL: "https://ollama.com",
  },
];

export function presetToProvider(preset: ProviderPreset): ProviderConfig {
  return {
    id: nanoid(10),
    name: preset.name,
    engine: preset.engine,
    baseURL: preset.baseURL,
    apiKey: "",
    models: [...preset.models],
    enabled: true,
    preset: preset.id,
  };
}

export function createCustomProvider(): ProviderConfig {
  return {
    id: nanoid(10),
    name: "自定义供应商",
    engine: "openai",
    baseURL: "https://",
    apiKey: "",
    models: [],
    enabled: true,
    preset: "custom",
  };
}

export const ENGINE_LABELS: Record<Engine, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic",
  google: "Google Gemini",
};
