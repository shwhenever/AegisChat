// ============================================================
// /api/chat — unified streaming proxy for 3 engine families.
// Keys are received per-request, used in-memory only, never logged
// or persisted. Normalizes upstream SSE into Aegis events:
//   {type:'delta', text} | {type:'usage', prompt, completion, total}
//   | {type:'redaction', count, types} | {type:'error', message}
//   | {type:'done'}
// ============================================================

import { NextRequest } from "next/server";
import { analyzeConversationRisk, redactOutput } from "@/lib/safety";
import type { Engine } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReqMsg {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[]; // data URLs (e.g. data:image/png;base64,...)
}

interface ChatRequestBody {
  engine: Engine;
  baseURL: string;
  apiKey: string;
  model: string;
  messages: ReqMsg[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  redact?: boolean;
  safety?: "off" | "warn" | "strict";
}

function dataUrlParts(dataUrl: string): { mime: string; data: string } | null {
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl.trim());
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

type OutEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; prompt: number; completion: number; total: number }
  | { type: "redaction"; count: number; types: string[] }
  | { type: "error"; message: string }
  | { type: "done" };

const enc = new TextEncoder();
function sse(data: unknown): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

function buildUpstream(body: ChatRequestBody): { url: string; init: RequestInit } {
  const base = body.baseURL.replace(/\/+$/, "");
  const isOSeries = /^(o1|o3|o4)/i.test(body.model);

  if (body.engine === "anthropic") {
    const msgs = body.messages.filter((m) => m.role !== "system");
    const mapMsg = (m: ReqMsg) => {
      if (m.images && m.images.length) {
        const content: unknown[] = [{ type: "text", text: m.content }];
        for (const img of m.images) {
          const p = dataUrlParts(img);
          if (p) content.push({ type: "image", source: { type: "base64", media_type: p.mime, data: p.data } });
        }
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    };
    const init: RequestInit = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": body.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model,
        system: body.system || undefined,
        messages: msgs.map(mapMsg),
        max_tokens: body.maxTokens || 4096,
        temperature: body.temperature ?? undefined,
        stream: true,
      }),
    };
    return { url: `${base}/messages`, init };
  }

  if (body.engine === "google") {
    const contents = body.messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        const parts: unknown[] = [{ text: m.content }];
        if (m.images) {
          for (const img of m.images) {
            const p = dataUrlParts(img);
            if (p) parts.push({ inlineData: { mimeType: p.mime, data: p.data } });
          }
        }
        return { role: m.role === "assistant" ? "model" : "user", parts };
      });
    const init: RequestInit = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": body.apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: body.system ? { parts: [{ text: body.system }] } : undefined,
        generationConfig: {
          temperature: body.temperature ?? undefined,
          maxOutputTokens: body.maxTokens || undefined,
        },
      }),
    };
    return {
      url: `${base}/models/${encodeURIComponent(body.model)}:streamGenerateContent?alt=sse`,
      init,
    };
  }

  // openai-compatible
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${body.apiKey}`,
  };
  if (base.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://aegis.app";
    headers["X-Title"] = "Aegis";
  }
  const mapOpenAIMsg = (m: ReqMsg) => {
    if (m.images && m.images.length) {
      const content: unknown[] = [{ type: "text", text: m.content }];
      for (const img of m.images) content.push({ type: "image_url", image_url: { url: img } });
      return { role: m.role, content };
    }
    return { role: m.role, content: m.content };
  };
  const messages = body.system
    ? [{ role: isOSeries ? "developer" : "system", content: body.system }, ...body.messages.map(mapOpenAIMsg)]
    : body.messages.map(mapOpenAIMsg);
  const payload: Record<string, unknown> = {
    model: body.model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (!isOSeries && typeof body.temperature === "number") payload.temperature = body.temperature;
  if (body.maxTokens) payload.max_tokens = body.maxTokens;

  return {
    url: `${base}/chat/completions`,
    init: { method: "POST", headers, body: JSON.stringify(payload) },
  };
}

async function* readSSE(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() || "";
    for (const raw of parts) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      yield line.slice(5).trim();
    }
  }
  const tail = buf.trim();
  if (tail.startsWith("data:")) yield tail.slice(5).trim();
}

async function* openaiEvents(res: Response): AsyncGenerator<OutEvent> {
  for await (const data of readSSE(res)) {
    if (data === "[DONE]") return;
    try {
      const json = JSON.parse(data);
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) yield { type: "delta", text: delta };
      if (json.usage) {
        yield {
          type: "usage",
          prompt: json.usage.prompt_tokens || 0,
          completion: json.usage.completion_tokens || 0,
          total: json.usage.total_tokens || 0,
        };
      }
    } catch {
      /* ignore malformed keep-alive lines */
    }
  }
}

async function* anthropicEvents(res: Response): AsyncGenerator<OutEvent> {
  // Anthropic SSE interleaves `event:` lines, but readSSE only yields `data:`
  // payloads; the JSON `type` field carries the event type, so we key on that.
  let inputTokens = 0;
  let lastOutputTokens = 0;
  for await (const data of readSSE(res)) {
    try {
      const json = JSON.parse(data);
      if (json.type === "message_start" && json.message?.usage) {
        inputTokens = json.message.usage.input_tokens || 0;
      } else if (json.type === "content_block_delta" && json.delta?.text) {
        yield { type: "delta", text: json.delta.text };
      } else if (json.type === "message_delta" && json.usage) {
        lastOutputTokens = json.usage.output_tokens || lastOutputTokens;
        yield {
          type: "usage",
          prompt: inputTokens,
          completion: lastOutputTokens,
          total: inputTokens + lastOutputTokens,
        };
      }
    } catch {
      /* ignore */
    }
  }
}

async function* googleEvents(res: Response): AsyncGenerator<OutEvent> {
  for await (const data of readSSE(res)) {
    if (!data || data === "[DONE]") continue;
    try {
      const json = JSON.parse(data);
      const parts = json.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) if (typeof p.text === "string") yield { type: "delta", text: p.text };
      }
      const u = json.usageMetadata;
      if (u) {
        yield {
          type: "usage",
          prompt: u.promptTokenCount || 0,
          completion: u.candidatesTokenCount || 0,
          total: u.totalTokenCount || 0,
        };
      }
    } catch {
      /* ignore */
    }
  }
}

function chooseEvents(engine: Engine, res: Response): AsyncGenerator<OutEvent> {
  if (engine === "anthropic") return anthropicEvents(res);
  if (engine === "google") return googleEvents(res);
  return openaiEvents(res);
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!body.engine || !body.baseURL || !body.model || !body.messages) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const finish = (extra?: OutEvent) => {
        if (extra) controller.enqueue(sse(extra));
        controller.enqueue(sse({ type: "done" }));
        controller.close();
      };

      // Defense-in-depth: strict mode blocks high-risk prompts at the edge.
      if (body.safety === "strict") {
        const risk = analyzeConversationRisk(body.messages);
        if (risk.level === "danger") {
          finish({
            type: "error",
            message: `安全护盾已拦截：检测到高风险提示注入（${risk.reasons.join("、")}）`,
          });
          return;
        }
      }

      try {
        const { url, init } = buildUpstream(body);
        const upstream = await fetch(url, init);
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          let message = `上游错误 ${upstream.status}`;
          try {
            const j = JSON.parse(detail);
            message += `：${j.error?.message || j.error || j.message || detail.slice(0, 200)}`;
          } catch {
            if (detail) message += `：${detail.slice(0, 200)}`;
          }
          finish({ type: "error", message });
          return;
        }

        const events = chooseEvents(body.engine, upstream);
        let redactionTotal = 0;
        const redactionTypes = new Set<string>();

        for await (const ev of events) {
          if (ev.type === "delta" && body.redact) {
            const r = redactOutput(ev.text);
            if (r.count) {
              redactionTotal += r.count;
              r.types.forEach((t) => redactionTypes.add(t));
            }
            controller.enqueue(sse({ type: "delta", text: r.text }));
          } else {
            controller.enqueue(sse(ev));
          }
        }

        if (redactionTotal > 0) {
          controller.enqueue(
            sse({ type: "redaction", count: redactionTotal, types: Array.from(redactionTypes) })
          );
        }
        finish();
      } catch (e) {
        finish({ type: "error", message: e instanceof Error ? e.message : "stream failed" });
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
