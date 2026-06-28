"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  Pencil,
  AlertTriangle,
  ShieldAlert,
  Coins,
  Clock,
  User,
  X,
} from "lucide-react";
import type { Message } from "@/lib/types";
import { Markdown } from "./Markdown";
import { Logo } from "./Logo";
import { Badge } from "./ui";
import { useChatStore } from "@/lib/store/chat";
import { cn, formatCost, formatNumber } from "@/lib/utils";

export function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const editMessage = useChatStore((s) => s.editMessage);
  const regenerate = useChatStore((s) => s.regenerate);
  const streaming = useChatStore((s) => s.streaming);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 aegis-rise">
        <div className="max-w-[78%] space-y-1.5">
          {message.risk && message.risk.level !== "safe" && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px]",
                message.risk.level === "danger" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"
              )}
            >
              <ShieldAlert size={12} />
              安全护盾：检测到潜在提示注入（{message.risk.reasons.join("、")}）
            </div>
          )}
          {editing ? (
            <div className="rounded-2xl border border-accent/40 bg-surface-2 p-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full resize-none bg-transparent text-sm text-text outline-none"
                rows={3}
                autoFocus
              />
              <div className="mt-1 flex justify-end gap-1">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-3"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    editMessage(message.id, draft);
                    setEditing(false);
                  }}
                  className="rounded bg-accent px-2.5 py-1 text-xs text-accent-fg"
                >
                  保存并重发
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative rounded-2xl rounded-tr-sm border border-border-strong bg-surface-2 px-4 py-2.5 text-[15px] leading-relaxed">
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.attachments.filter((a) => a.type.startsWith("image/")).map((a) => (
                    <img
                      key={a.id}
                      src={a.data}
                      alt={a.name}
                      className="max-h-40 rounded-lg border border-border"
                    />
                  ))}
                </div>
              )}
              <div className="absolute -left-1 -bottom-1 hidden gap-0.5 rounded-md bg-surface-3/90 px-1 py-0.5 backdrop-blur group-hover:flex">
                <IconBtn title="复制" onClick={copy}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </IconBtn>
                <IconBtn title="编辑" onClick={() => setEditing(true)}>
                  <Pencil size={12} />
                </IconBtn>
              </div>
            </div>
          )}
        </div>
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-text-muted">
          <User size={15} />
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="group flex gap-3 aegis-rise">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft shield-ring">
        <Logo size={17} />
      </div>
      <div className="min-w-0 max-w-[82%] flex-1 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] text-text-faint">
          <span className="font-medium text-text-muted">Aegis</span>
          {message.model && <span className="font-mono">{message.model}</span>}
        </div>

        {message.error ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <div className="break-words">{message.error}</div>
          </div>
        ) : message.content ? (
          <div className="rounded-2xl rounded-tl-sm border border-border bg-surface/50 px-4 py-3">
            <Markdown content={message.content} />
            {message.pending && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-accent" />
            )}
          </div>
        ) : message.pending ? (
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-surface/50 px-4 py-3.5">
            <span className="aegis-dot h-2 w-2 rounded-full bg-accent" />
            <span className="aegis-dot h-2 w-2 rounded-full bg-accent" style={{ animationDelay: "0.2s" }} />
            <span className="aegis-dot h-2 w-2 rounded-full bg-accent" style={{ animationDelay: "0.4s" }} />
          </div>
        ) : null}

        {/* meta row */}
        {!message.pending && !message.error && (
          <div className="flex flex-wrap items-center gap-1.5">
            {message.usage && (
              <>
                <Chip icon={<Coins size={11} />}>
                  {formatCost(message.usage.cost)}
                </Chip>
                <Chip icon={<Clock size={11} />}>
                  {(message.usage.durationMs / 1000).toFixed(1)}s
                </Chip>
                <Chip>
                  {formatNumber(message.usage.prompt)}↑ {formatNumber(message.usage.completion)}↓
                </Chip>
              </>
            )}
            {message.redactions && message.redactions > 0 && (
              <Badge tone="warn">
                <ShieldAlert size={10} /> 已脱敏 {message.redactions}
              </Badge>
            )}
            <div className="ml-auto flex gap-0.5 opacity-0 transition group-hover:opacity-100">
              <IconBtn title="复制" onClick={copy}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </IconBtn>
              {!streaming && (
                <IconBtn title="重新生成" onClick={() => regenerate(message.id)}>
                  <RefreshCw size={12} />
                </IconBtn>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded p-1 text-text-faint hover:bg-surface-3 hover:text-text transition"
    >
      {children}
    </button>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-faint">
      {icon}
      {children}
    </span>
  );
}
