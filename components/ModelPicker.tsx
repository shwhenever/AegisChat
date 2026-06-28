"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Shield, ShieldAlert, ShieldOff } from "lucide-react";
import { useVaultStore } from "@/lib/store/vault";
import { useChatStore } from "@/lib/store/chat";
import { useSettingsStore } from "@/lib/store/settings";
import { ENGINE_LABELS } from "@/lib/providers";
import { cn } from "@/lib/utils";
import type { SafetyMode } from "@/lib/types";

const SAFETY_META: Record<SafetyMode, { label: string; icon: typeof Shield; tone: string }> = {
  off: { label: "护盾关闭", icon: ShieldOff, tone: "text-text-faint" },
  warn: { label: "护盾警告", icon: Shield, tone: "text-accent" },
  strict: { label: "护盾严格", icon: ShieldAlert, tone: "text-warn" },
};

export function ModelPicker() {
  const providers = useVaultStore((s) => s.providers);
  const activeId = useChatStore((s) => s.activeId);
  const conv = useChatStore((s) => s.conversations.find((c) => c.id === s.activeId));
  const setModel = useChatStore((s) => s.setConversationModel);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!conv) return null;
  const provider = providers.find((p) => p.id === conv.providerId);
  const enabled = providers.filter((p) => p.enabled);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs hover:bg-surface-3 transition max-w-[220px]"
      >
        <span className="truncate">
          <span className="text-text-faint">{provider?.name ?? "未选择"}</span>
          <span className="mx-1 text-text-faint">/</span>
          <span className="text-text font-medium">{conv.model || "选择模型"}</span>
        </span>
        <ChevronDown size={13} className="shrink-0 text-text-faint" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 max-h-80 w-72 overflow-y-auto rounded-xl border border-border-strong bg-bg-elev p-1.5 shadow-[var(--shadow)] aegis-rise">
          {enabled.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-text-faint">
              暂无可用供应商，请前往设置添加
            </div>
          )}
          {enabled.map((p) => (
            <div key={p.id} className="mb-0.5">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase tracking-wide text-text-faint">
                <span>{p.name}</span>
                <span>{ENGINE_LABELS[p.engine]}</span>
              </div>
              {p.models.length === 0 && (
                <div className="px-2 py-1 text-[11px] text-text-faint">未配置模型</div>
              )}
              {p.models.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModel(conv.id, p.id, m);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition",
                    p.id === conv.providerId && m === conv.model
                      ? "bg-accent-soft text-accent"
                      : "text-text hover:bg-surface-2"
                  )}
                >
                  <span className="truncate font-mono">{m}</span>
                  {p.id === conv.providerId && m === conv.model && <Check size={13} />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SafetyToggle() {
  const mode = useSettingsStore((s) => s.settings.safetyMode);
  const setMode = useSettingsStore((s) => s.setSafetyMode);
  const meta = SAFETY_META[mode];
  const Icon = meta.icon;
  const next: SafetyMode = mode === "off" ? "warn" : mode === "warn" ? "strict" : "off";
  return (
    <button
      onClick={() => setMode(next)}
      title={`安全护盾：${meta.label}（点击切换）`}
      className={cn("flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs hover:bg-surface-3 transition", meta.tone)}
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{meta.label}</span>
    </button>
  );
}
