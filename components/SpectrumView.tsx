"use client";

import { useRef, useState } from "react";
import {
  Plus,
  X,
  Play,
  Square,
  Copy,
  Check,
  Loader2,
  GitCompareArrows,
  AlertTriangle,
  ShieldCheck,
  Coins,
  ArrowRight,
} from "lucide-react";
import { useVaultStore } from "@/lib/store/vault";
import { useSettingsStore } from "@/lib/store/settings";
import { useChatStore } from "@/lib/store/chat";
import { streamChat } from "@/lib/chat-client";
import { analyzePromptRisk } from "@/lib/safety";
import { estimateCost } from "@/lib/pricing";
import { ENGINE_LABELS } from "@/lib/providers";
import type { ProviderConfig } from "@/lib/types";
import { Markdown } from "./Markdown";
import { Logo } from "./Logo";
import { EmptyState } from "./ui";
import { cn, formatCost, formatNumber } from "@/lib/utils";

interface Slot {
  id: string;
  providerId: string;
  model: string;
}
interface Result {
  content: string;
  status: "idle" | "running" | "done" | "error";
  error?: string;
  prompt?: number;
  completion?: number;
  cost?: number;
  durationMs?: number;
  redactions?: number;
}

export function SpectrumView() {
  const providers = useVaultStore((s) => s.providers);
  const settings = useSettingsStore((s) => s.settings);
  const newConv = useChatStore((s) => s.newConversation);
  const setModel = useChatStore((s) => s.setConversationModel);
  const send = useChatStore((s) => s.sendMessage);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [risk, setRisk] = useState<string[] | null>(null);
  const aborts = useRef<AbortController[]>([]);

  const enabled = providers.filter((p) => p.enabled);

  const addSlot = (providerId: string, model: string) => {
    if (slots.length >= 4) return;
    if (slots.some((s) => s.providerId === providerId && s.model === model)) return;
    const id = `${providerId}:${model}`;
    setSlots((prev) => [...prev, { id, providerId, model }]);
    setResults((prev) => ({ ...prev, [id]: { content: "", status: "idle" } }));
    setPickerOpen(false);
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    setResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const stop = () => {
    aborts.current.forEach((a) => a.abort());
    aborts.current = [];
    setRunning(false);
    setResults((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k].status === "running") next[k] = { ...next[k], status: "done" };
      return next;
    });
  };

  const run = async () => {
    if (!prompt.trim() || slots.length === 0 || running) return;
    setRunning(true);
    aborts.current = [];

    // safety
    const r = analyzePromptRisk(prompt);
    if (settings.safetyMode !== "off" && r.level !== "safe") setRisk(r.reasons);
    else setRisk(null);
    if (settings.safetyMode === "strict" && r.level === "danger") {
      setResults(() => {
        const next: Record<string, Result> = {};
        for (const s of slots) next[s.id] = { content: "", status: "error", error: `安全护盾拦截：${r.reasons.join("、")}` };
        return next;
      });
      setRunning(false);
      return;
    }

    // reset
    const fresh: Record<string, Result> = {};
    for (const s of slots) fresh[s.id] = { content: "", status: "running" };
    setResults(fresh);

    const messages = [{ role: "user", content: prompt }];

    await Promise.all(
      slots.map(async (slot) => {
        const provider = providers.find((p) => p.id === slot.providerId);
        if (!provider || (!provider.apiKey && provider.preset !== "ollama")) {
          setResults((prev) => ({
            ...prev,
            [slot.id]: { content: "", status: "error", error: "未配置 API 密钥" },
          }));
          return;
        }
        const ac = new AbortController();
        aborts.current.push(ac);
        const start = Date.now();
        let redactions = 0;
        await streamChat(
          {
            engine: provider.engine,
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
            model: slot.model,
            messages,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            redact: settings.redactOutput,
            safety: settings.safetyMode,
            signal: ac.signal,
          },
          {
            onDelta: (text) =>
              setResults((prev) => ({
                ...prev,
                [slot.id]: { ...prev[slot.id], content: prev[slot.id].content + text, status: "running" },
              })),
            onUsage: (u) =>
              setResults((prev) => ({
                ...prev,
                [slot.id]: {
                  ...prev[slot.id],
                  prompt: u.prompt,
                  completion: u.completion,
                  cost: estimateCost(slot.model, u.prompt, u.completion),
                  durationMs: Date.now() - start,
                },
              })),
            onRedaction: (rr) => {
              redactions += rr.count;
            },
            onError: (msg) =>
              setResults((prev) => ({ ...prev, [slot.id]: { ...prev[slot.id], status: "error", error: msg } })),
            onDone: () =>
              setResults((prev) => ({
                ...prev,
                [slot.id]: { ...prev[slot.id], status: "done", redactions: redactions || prev[slot.id].redactions },
              })),
          }
        );
      })
    );
    setRunning(false);
  };

  const continueInChat = (slot: Slot) => {
    const id = newConv();
    if (id) {
      setModel(id, slot.providerId, slot.model);
      send(prompt);
    }
  };

  if (enabled.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<GitCompareArrows size={40} />}
          title="尚未配置可用供应商"
          desc="前往设置添加至少一个供应商与 API 密钥，即可使用 Spectrum 多模型对比。"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <GitCompareArrows size={17} />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold">Spectrum 多模型对比</h2>
            <p className="text-[11px] text-text-faint">同一问题，多模型并行作答，横向对比质量、速度与成本</p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {/* model selection */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {slots.map((s) => {
            const p = providers.find((x) => x.id === s.providerId);
            return (
              <div key={s.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs">
                <span className="text-text-faint">{p?.name}</span>
                <span className="text-text-faint">/</span>
                <span className="font-mono text-text">{s.model}</span>
                {!running && (
                  <button onClick={() => removeSlot(s.id)} className="ml-1 text-text-faint hover:text-danger">
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
          {slots.length < 4 && (
            <div className="relative">
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-border-strong px-2.5 py-1.5 text-xs text-text-muted hover:border-accent/50 hover:text-accent"
              >
                <Plus size={13} /> 添加模型
              </button>
              {pickerOpen && (
                <div className="absolute left-0 top-full z-30 mt-1.5 max-h-80 w-72 overflow-y-auto rounded-xl border border-border-strong bg-bg-elev p-1.5 shadow-[var(--shadow)] aegis-rise">
                  {enabled.map((p) => (
                    <div key={p.id} className="mb-0.5">
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-text-faint">
                        {p.name} · {ENGINE_LABELS[p.engine]}
                      </div>
                      {p.models.map((m) => (
                        <button
                          key={m}
                          onClick={() => addSlot(p.id, m)}
                          disabled={slots.some((s) => s.providerId === p.id && s.model === m)}
                          className="block w-full truncate rounded-lg px-2 py-1.5 text-left font-mono text-xs text-text hover:bg-surface-2 disabled:opacity-30"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* prompt bar */}
        <div className="relative mb-4 flex items-end gap-2 rounded-2xl border border-border-strong bg-surface-2 p-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run();
              }
            }}
            placeholder="输入要对比的问题…  (Enter 运行，最多 4 个模型并行)"
            rows={2}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-text placeholder:text-text-faint outline-none"
          />
          {running ? (
            <button
              onClick={stop}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-danger/15 px-3 text-xs text-danger hover:bg-danger/25"
            >
              <Square size={13} fill="currentColor" /> 停止
            </button>
          ) : (
            <button
              onClick={run}
              disabled={!prompt.trim() || slots.length === 0}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition",
                prompt.trim() && slots.length
                  ? "bg-accent text-accent-fg hover:brightness-110"
                  : "bg-surface-3 text-text-faint"
              )}
            >
              <Play size={13} fill="currentColor" /> 并行运行
            </button>
          )}
        </div>

        {risk && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            <ShieldCheck size={14} /> 安全护盾提示：{risk.join("、")}
          </div>
        )}

        {/* results grid */}
        {slots.length === 0 ? (
          <EmptyState
            icon={<GitCompareArrows size={36} />}
            title="选择模型开始对比"
            desc="添加 2-4 个模型，输入问题后并行运行，直观比较各模型的回答质量、速度与成本。"
          />
        ) : (
          <div className={cn("grid gap-3", slots.length <= 2 ? "grid-cols-1 md:grid-cols-2" : slots.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4")}>
            {slots.map((slot) => {
              const p = providers.find((x) => x.id === slot.providerId) as ProviderConfig | undefined;
              const res = results[slot.id] || { content: "", status: "idle" as const };
              return (
                <ResultColumn
                  key={slot.id}
                  providerName={p?.name || ""}
                  model={slot.model}
                  result={res}
                  onContinue={() => continueInChat(slot)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultColumn({
  providerName,
  model,
  result,
  onContinue,
}: {
  providerName: string;
  model: string;
  result: Result;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface/40">
      <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-text">{providerName}</div>
          <div className="truncate font-mono text-[10px] text-text-faint">{model}</div>
        </div>
        {result.status === "running" && <Loader2 size={13} className="animate-spin text-accent" />}
        {result.status === "done" && <span className="h-2 w-2 rounded-full bg-accent" />}
        {result.status === "error" && <AlertTriangle size={13} className="text-danger" />}
      </div>
      <div className="min-h-[180px] flex-1 overflow-y-auto px-3 py-2.5 text-sm">
        {result.error ? (
          <div className="flex items-start gap-2 text-xs text-danger">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span className="break-words">{result.error}</span>
          </div>
        ) : result.content ? (
          <Markdown content={result.content} />
        ) : result.status === "running" ? (
          <div className="flex items-center gap-1.5 py-4 text-text-faint">
            <span className="aegis-dot h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="aegis-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: "0.2s" }} />
            <span className="aegis-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: "0.4s" }} />
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-text-faint">等待运行</div>
        )}
        {result.status === "running" && result.content && (
          <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-accent" />
        )}
      </div>
      {result.status === "done" && (
        <div className="border-t border-border bg-surface-2/40 px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-faint">
            {result.cost !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Coins size={10} /> {formatCost(result.cost)}
              </span>
            )}
            {result.durationMs !== undefined && <span>{(result.durationMs / 1000).toFixed(1)}s</span>}
            {result.completion !== undefined && (
              <span>{formatNumber(result.completion)}↓</span>
            )}
            {result.redactions && result.redactions > 0 && (
              <span className="text-warn">脱敏 {result.redactions}</span>
            )}
          </div>
          <div className="mt-1.5 flex gap-1">
            <button onClick={copy} className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-text-muted hover:bg-surface-3 hover:text-text">
              {copied ? <Check size={11} /> : <Copy size={11} />} 复制
            </button>
            <button onClick={onContinue} className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-text-muted hover:bg-surface-3 hover:text-accent">
              <ArrowRight size={11} /> 继续对话
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
