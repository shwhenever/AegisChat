// ============================================================
// Aegis — shared domain types
// ============================================================

export type Engine = "openai" | "anthropic" | "google";

export interface ProviderConfig {
  id: string;
  name: string;
  engine: Engine;
  baseURL: string;
  apiKey: string; // decrypted, only held in memory
  models: string[];
  enabled: boolean;
  preset?: string;
}

export type Role = "user" | "assistant" | "system";

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface MessageUsage extends TokenUsage {
  cost: number;
  durationMs: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data?: string; // data URL for images
  text?: string; // extracted text for documents
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  model?: string;
  providerId?: string;
  createdAt: number;
  usage?: MessageUsage;
  error?: string;
  attachments?: Attachment[];
  pending?: boolean;
  /** safety metadata */
  risk?: RiskAssessment;
  redactions?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  providerId: string;
  model: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  spectrum?: boolean;
}

export type SafetyMode = "off" | "warn" | "strict";

export type RiskLevel = "safe" | "caution" | "danger";

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

export interface UsageRecord {
  id: string;
  conversationId: string;
  providerId: string;
  providerName: string;
  model: string;
  prompt: number;
  completion: number;
  cost: number;
  timestamp: number;
}

export interface PromptVersion {
  version: number;
  content: string;
  note?: string;
  createdAt: number;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  tags: string[];
  category: string;
  versions: PromptVersion[];
  createdAt: number;
  updatedAt: number;
  favorite?: boolean;
}

export interface VaultBlob {
  providers: ProviderConfig[];
}

export interface AppSettings {
  theme: "dark" | "light";
  safetyMode: SafetyMode;
  redactOutput: boolean;
  sendOnEnter: boolean;
  streamOutput: boolean;
  defaultProviderId: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  density: "comfortable" | "compact";
}
