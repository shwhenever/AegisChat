"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowUp, Square, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import { useChatStore } from "@/lib/store/chat";
import { useSettingsStore } from "@/lib/store/settings";
import { nanoid } from "nanoid";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Composer() {
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const send = useChatStore((s) => s.sendMessage);
  const stop = useChatStore((s) => s.stopStreaming);
  const streaming = useChatStore((s) => s.streaming);
  const sendOnEnter = useSettingsStore((s) => s.settings.sendOnEnter);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [text]);

  const handleSend = async () => {
    if ((!text.trim() && atts.length === 0) || streaming) return;
    setBusy(true);
    const t = text;
    const a = atts;
    setText("");
    setAtts([]);
    try {
      await send(t, a.length ? a : undefined);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && sendOnEnter) {
      e.preventDefault();
      handleSend();
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      const att: Attachment = {
        id: nanoid(8),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      };
      if (file.type.startsWith("image/")) {
        att.data = await readAsDataURL(file);
      } else if (isTextLike(file)) {
        att.text = (await readAsText(file)).slice(0, 200_000);
      }
      next.push(att);
    }
    setAtts((prev) => [...prev, ...next]);
  };

  return (
    <div className="border-t border-border bg-bg-elev/60 px-3 py-3 backdrop-blur md:px-6 md:py-4">
      <div className="mx-auto max-w-3xl">
        {atts.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {atts.map((a) => (
              <div
                key={a.id}
                className="group relative flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-1.5"
              >
                {a.data ? (
                  <img src={a.data} alt={a.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-3 text-text-faint">
                    {a.type.startsWith("image/") ? <ImageIcon size={14} /> : <FileText size={14} />}
                  </div>
                )}
                <span className="max-w-[120px] truncate text-xs text-text-muted">{a.name}</span>
                <button
                  onClick={() => setAtts((prev) => prev.filter((x) => x.id !== a.id))}
                  className="text-text-faint hover:text-danger"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 rounded-2xl border border-border-strong bg-surface-2 p-2 shadow-[var(--shadow)] focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15">
          <button
            onClick={() => fileRef.current?.click()}
            title="添加附件（图片/文本）"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-3 hover:text-text transition"
          >
            <Paperclip size={17} />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.html,.css,.xml,.yaml,.yml,.log"
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="发送消息…  (Enter 发送，Shift+Enter 换行)"
            rows={1}
            className="max-h-60 flex-1 resize-none bg-transparent py-2 text-[15px] text-text placeholder:text-text-faint outline-none"
          />
          {streaming ? (
            <button
              onClick={stop}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger hover:bg-danger/25 transition"
              title="停止"
            >
              <Square size={15} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={busy || (!text.trim() && atts.length === 0)}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                text.trim() || atts.length
                  ? "bg-accent text-accent-fg hover:brightness-110 shadow-[0_4px_14px_-4px_var(--accent)]"
                  : "bg-surface-3 text-text-faint"
              )}
              title="发送"
            >
              <ArrowUp size={17} />
            </button>
          )}
        </div>
        <div className="mt-1.5 px-1 text-center text-[10px] text-text-faint">
          Aegis 不会上传你的对话 · 密钥经本地加密 · 输出可能存在不准确信息
        </div>
      </div>
    </div>
  );
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsText(file);
  });
}

function isTextLike(file: File): boolean {
  const textExt = [".txt", ".md", ".json", ".csv", ".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".xml", ".yaml", ".yml", ".log", ".svg"];
  return file.type.startsWith("text/") || textExt.some((e) => file.name.toLowerCase().endsWith(e));
}
