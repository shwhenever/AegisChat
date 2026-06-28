// ============================================================
// Aegis Safety Shield — isomorphic (browser + edge/node)
// 1) Prompt-injection / jailbreak risk analysis on user input
// 2) Output redaction of leaked secrets & PII
// Pure string heuristics — no network, no model calls, fully offline.
// ============================================================

import type { RiskAssessment, RiskLevel } from "./types";

interface Rule {
  id: string;
  weight: number;
  reason: string;
  pattern: RegExp;
}

// Patterns tuned to catch common injection / exfiltration attempts.
const INJECTION_RULES: Rule[] = [
  {
    id: "ignore-instructions",
    weight: 3,
    reason: "尝试忽略先前指令",
    pattern: /ignore\s+(all|previous|prior|the\s+above|your)\s+(instructions|prompts?|rules|guidelines)/i,
  },
  {
    id: "disregard",
    weight: 3,
    reason: "要求无视系统规则",
    pattern: /disregard\s+(all|the|previous|prior|above)\s+(instructions|rules|prompts?)/i,
  },
  {
    id: "forget",
    weight: 3,
    reason: "要求遗忘上下文",
    pattern: /\b(forget|drop)\s+(everything|all|previous|prior|above)\b/i,
  },
  {
    id: "reveal-prompt",
    weight: 4,
    reason: "尝试窃取系统提示词",
    pattern: /(reveal|show|print|repeat|output|leak|expose|display)\s+(your|the|initial|original|hidden)\s+(system\s+)?(prompt|instructions?|rules|configuration)/i,
  },
  {
    id: "repeat-above",
    weight: 4,
    reason: "诱导回显上方内容",
    pattern: /repeat\s+(the\s+)?(words?|instructions?|text)\s+(above|before|prior)/i,
  },
  {
    id: "new-role",
    weight: 3,
    reason: "尝试重置角色/越狱",
    pattern: /(you\s+are\s+now|act\s+as|from\s+now\s+on|enter\s+(developer|jailbreak|god|root|sudo)\s+mode|enable\s+developer\s+mode)/i,
  },
  {
    id: "dan-jailbreak",
    weight: 4,
    reason: "检测到越狱模式关键词",
    pattern: /\b(DAN|jailbreak|do\s+anything\s+now|AIM\s+mode|STAN|evil\s+mode|unrestricted\s+mode)\b/i,
  },
  {
    id: "no-rules",
    weight: 4,
    reason: "要求解除限制",
    pattern: /(no\s+(rules|restrictions|limits|guidelines)|without\s+(any\s+)?restrictions|bypass\s+(your|the|safety|content)\s+(rules|filters|policy|guardrails))/i,
  },
  {
    id: "token-injection",
    weight: 5,
    reason: "检测到特殊控制标记注入",
    pattern: /(<\|im_start\|>|<\|im_end\|>|<\/?system>|<\/?assistant>|<\|(system|assistant|end)\|>)/i,
  },
  {
    id: "role-spoof",
    weight: 3,
    reason: "伪造角色标记",
    pattern: /^\s*(system|assistant|developer)\s*:/im,
  },
  {
    id: "override-system",
    weight: 4,
    reason: "尝试覆盖系统设定",
    pattern: /(override|replace|update|change)\s+(your|the)\s+(system|initial|base)\s+(prompt|instructions?|rules)/i,
  },
  {
    id: "encoding-evasion",
    weight: 2,
    reason: "疑似编码规避检测",
    pattern: /(base64|decode\s+the\s+following|rot13|hex\s+decode|unicode\s+escape)/i,
  },
  {
    id: "policy-override",
    weight: 3,
    reason: "诱导违反安全策略",
    pattern: /(it'?s\s+(ok|safe|fine|allowed)\s+to|you\s+(are|re)\s+(allowed|permitted|free)\s+to|this\s+is\s+(a\s+)?(test|safe\s+environment|sandbox))/i,
  },
];

export function analyzePromptRisk(text: string): RiskAssessment {
  const reasons: string[] = [];
  let score = 0;
  for (const rule of INJECTION_RULES) {
    if (rule.pattern.test(text)) {
      score += rule.weight;
      reasons.push(rule.reason);
    }
  }
  // Length-based soft signal: extremely long user turns can hide injections.
  if (text.length > 8000) {
    score += 1;
    reasons.push("超长输入，建议分段核对");
  }

  let level: RiskLevel = "safe";
  if (score >= 7) level = "danger";
  else if (score >= 3) level = "caution";

  return { level, score, reasons: Array.from(new Set(reasons)).slice(0, 5) };
}

export function analyzeConversationRisk(messages: { role: string; content: string }[]): RiskAssessment {
  // Analyze the most recent user message primarily, plus any system-spoofing.
  const userMsgs = messages.filter((m) => m.role === "user");
  const last = userMsgs[userMsgs.length - 1];
  if (!last) return { level: "safe", score: 0, reasons: [] };
  return analyzePromptRisk(last.content || "");
}

// ---- Output redaction -------------------------------------------------

interface RedactPattern {
  id: string;
  label: string;
  pattern: RegExp;
}

const REDACT_PATTERNS: RedactPattern[] = [
  { id: "openai", label: "OpenAI Key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { id: "anthropic", label: "Anthropic Key", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { id: "google", label: "Google API Key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "aws", label: "AWS Key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: "github", label: "GitHub Token", pattern: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g },
  { id: "bearer", label: "Bearer Token", pattern: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/g },
  { id: "private-key", label: "私钥", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  { id: "ssn", label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { id: "card", label: "信用卡号", pattern: /\b(?:\d[ -]?){13,16}\b/g },
  { id: "jwt", label: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { id: "connection", label: "连接字符串", pattern: /\b(mongodb(\+srv)?|postgres(ql)?|redis|amqp):\/\/[^\s'"<>]+/gi },
];

export interface RedactionResult {
  text: string;
  count: number;
  types: string[];
}

export function redactOutput(text: string): RedactionResult {
  let count = 0;
  const types = new Set<string>();
  let out = text;
  for (const rp of REDACT_PATTERNS) {
    out = out.replace(rp.pattern, () => {
      count++;
      types.add(rp.label);
      return `[REDACTED:${rp.label}]`;
    });
  }
  return { text: out, count, types: Array.from(types) };
}
