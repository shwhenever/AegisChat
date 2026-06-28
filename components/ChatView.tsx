"use client";

import { useEffect, useRef, useState } from "react";
import { Settings2, Sparkles, Trash2, ArrowRight, ShieldCheck } from "lucide-react";
import { useChatStore } from "@/lib/store/chat";
import { MessageItem } from "./MessageItem";
import { Composer } from "./Composer";
import { ModelPicker, SafetyToggle } from "./ModelPicker";
import { Button, EmptyState, Modal, inputCls } from "./ui";
import { Logo } from "./Logo";

const SUGGESTIONS = [
  { title: "解释量子纠缠", desc: "用类比向高中生讲清楚" },
  { title: "审查这段代码的安全问题", desc: "粘贴代码，我来逐项分析" },
  { title: "帮我写一个产品发布邮件", desc: "专业、简洁、突出价值" },
  { title: "对比 React 与 Vue 的状态管理", desc: "表格 + 关键差异" },
];

export function ChatView() {
  const conv = useChatStore((s) => s.conversations.find((c) => c.id === s.activeId));
  const newConv = useChatStore((s) => s.newConversation);
  const send = useChatStore((s) => s.sendMessage);
  const clear = useChatStore((s) => s.clearAll);
  const setSystem = useChatStore((s) => s.setSystemPrompt);
  const [sysOpen, setSysOpen] = useState(false);
  const [sysDraft, setSysDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages]);

  useEffect(() => {
    setSysDraft(conv?.systemPrompt || "");
  }, [conv?.id, conv?.systemPrompt]);

  if (!conv) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Logo size={40} />}
          title="开始一段新对话"
          desc="选择供应商与模型，发送消息即可。所有密钥经本地加密，对话仅存于本设备。"
          action={
            <Button variant="primary" onClick={() => newConv()}>
              <Sparkles size={16} /> 新建对话
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 md:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-semibold">{conv.title}</h2>
          <div className="flex items-center gap-1 text-[11px] text-text-faint">
            <ShieldCheck size={11} className="text-accent" />
            端到端本地加密 · {conv.messages.length} 条消息
          </div>
        </div>
        <ModelPicker />
        <SafetyToggle />
        <button
          onClick={() => setSysOpen(true)}
          title="系统提示词"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <Settings2 size={16} />
        </button>
        <button
          onClick={() => {
            if (confirm("清空所有对话？此操作不可撤销。")) clear();
          }}
          title="清空全部"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </header>

      {/* messages */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conv.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6">
            <div className="mb-6 shield-ring rounded-2xl bg-surface/50 p-4">
              <Logo size={48} />
            </div>
            <h1 className="font-display text-2xl font-bold">
              <span className="text-grad">Aegis</span> 已就绪
            </h1>
            <p className="mt-2 text-sm text-text-muted">选择模型，从下面任选一个开始，或直接输入你的问题</p>
            <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => send(s.title)}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-surface/50 p-3.5 text-left transition hover:border-accent/40 hover:bg-surface-2"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text">{s.title}</div>
                    <div className="text-xs text-text-faint">{s.desc}</div>
                  </div>
                  <ArrowRight
                    size={15}
                    className="mt-0.5 text-text-faint transition group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5 px-3 py-6 md:px-6">
            {conv.messages.map((m) => (
              <MessageItem key={m.id} message={m} />
            ))}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      <Composer />

      <Modal open={sysOpen} onClose={() => setSysOpen(false)} title="系统提示词" wide>
        <div className="p-5 space-y-3">
          <p className="text-xs text-text-muted">
            为此对话设置系统级指令，引导模型的角色与行为。留空则不发送系统提示。
          </p>
          <textarea
            value={sysDraft}
            onChange={(e) => setSysDraft(e.target.value)}
            rows={8}
            placeholder="例：你是一位资深安全工程师，回答时强调威胁建模与最小权限原则…"
            className={inputCls + " resize-none font-mono text-xs"}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSysOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSystem(conv.id, sysDraft);
                setSysOpen(false);
              }}
            >
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
