// ============================================================
// Aegis streaming client — calls /api/chat and parses the
// normalized SSE into callbacks. Supports abort via AbortController.
// ============================================================

import type { Engine, SafetyMode } from "./types";

export interface StreamParams {
  engine: Engine;
  baseURL: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string; images?: string[] }[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  redact?: boolean;
  safety?: SafetyMode;
  signal?: AbortSignal;
}

export interface StreamCallbacks {
  onDelta?: (text: string) => void;
  onUsage?: (u: { prompt: number; completion: number; total: number }) => void;
  onRedaction?: (r: { count: number; types: string[] }) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

export async function streamChat(params: StreamParams, cb: StreamCallbacks): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...params, stream: true }),
      signal: params.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      cb.onDone?.();
      return;
    }
    cb.onError?.(e instanceof Error ? e.message : "网络请求失败");
    cb.onDone?.();
    return;
  }

  if (!res.ok || !res.body) {
    let msg = `请求失败 ${res.status}`;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {
      /* ignore */
    }
    cb.onError?.(msg);
    cb.onDone?.();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        let json: any;
        try {
          json = JSON.parse(line.slice(5).trim());
        } catch {
          continue;
        }
        switch (json.type) {
          case "delta":
            cb.onDelta?.(json.text as string);
            break;
          case "usage":
            cb.onUsage?.({
              prompt: json.prompt,
              completion: json.completion,
              total: json.total,
            });
            break;
          case "redaction":
            cb.onRedaction?.({ count: json.count, types: json.types });
            break;
          case "error":
            cb.onError?.(json.message as string);
            break;
          case "done":
            cb.onDone?.();
            return;
        }
      }
    }
    cb.onDone?.();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      cb.onDone?.();
      return;
    }
    cb.onError?.(e instanceof Error ? e.message : "流式读取失败");
    cb.onDone?.();
  }
}
