"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Star,
  Copy,
  Check,
  Pencil,
  Trash2,
  History,
  ArrowRight,
  Library as LibraryIcon,
  Save,
  RotateCcw,
} from "lucide-react";
import { usePromptStore } from "@/lib/store/prompts";
import { useChatStore } from "@/lib/store/chat";
import type { Prompt } from "@/lib/types";
import { Button, EmptyState, Field, Modal, inputCls, Badge } from "./ui";
import { cn } from "@/lib/utils";

export function LibraryView() {
  const prompts = usePromptStore((s) => s.prompts);
  const add = usePromptStore((s) => s.add);
  const remove = usePromptStore((s) => s.remove);
  const toggleFav = usePromptStore((s) => s.toggleFavorite);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("全部");
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);

  const categories = ["全部", ...Array.from(new Set(prompts.map((p) => p.category)))];
  const filtered = prompts.filter(
    (p) =>
      (cat === "全部" || p.category === cat) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.content.toLowerCase().includes(q.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())))
  );

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <LibraryIcon size={17} />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold">提示词库</h2>
              <p className="text-[11px] text-text-faint">可复用、带版本管理的提示词集合</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus size={15} /> 新建
          </Button>
        </div>
      </header>

      <div className="border-b border-border px-4 py-2.5 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索提示词…"
              className="w-full rounded-lg bg-surface-2 border border-border py-1.5 pl-8 pr-2 text-xs outline-none focus:border-accent/50"
            />
          </div>
          <div className="flex gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs transition",
                  cat === c ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<LibraryIcon size={36} />}
            title="暂无提示词"
            desc="创建可复用的提示词模板，支持版本管理与一键应用到对话。"
            action={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} /> 新建提示词</Button>}
          />
        ) : (
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                onEdit={() => setEditing(p)}
                onDelete={() => { if (confirm(`删除「${p.name}」？`)) remove(p.id); }}
                onFav={() => toggleFav(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <PromptEditor
          prompt={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) {
              await usePromptStore.getState().saveVersion(editing.id, data.content, "编辑");
              await usePromptStore.getState().update(editing.id, { name: data.name, category: data.category, tags: data.tags });
            } else {
              await add(data);
            }
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  onEdit,
  onDelete,
  onFav,
}: {
  prompt: Prompt;
  onEdit: () => void;
  onDelete: () => void;
  onFav: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const newConv = useChatStore((s) => s.newConversation);
  const setSystem = useChatStore((s) => s.setSystemPrompt);

  const useInChat = () => {
    const id = newConv();
    if (id) setSystem(id, prompt.content);
  };

  const copy = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-surface/40 p-4 transition hover:border-border-strong">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-medium text-text">{prompt.name}</h3>
            {prompt.favorite && <Star size={13} className="shrink-0 fill-warn text-warn" />}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone="neutral">{prompt.category}</Badge>
            {prompt.versions.length > 0 && (
              <Badge tone="info">
                <History size={9} /> {prompt.versions.length} 版本
              </Badge>
            )}
          </div>
        </div>
        <button onClick={onFav} className={cn("rounded p-1", prompt.favorite ? "text-warn" : "text-text-faint hover:text-warn")}>
          <Star size={15} className={prompt.favorite ? "fill-current" : ""} />
        </button>
      </div>
      <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-text-muted">{prompt.content}</p>
      <div className="mt-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button onClick={useInChat} className="flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-[11px] text-accent hover:brightness-110">
          <ArrowRight size={11} /> 新对话使用
        </button>
        <button onClick={copy} className="rounded p-1.5 text-text-faint hover:bg-surface-3 hover:text-text">
          {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
        </button>
        <button onClick={onEdit} className="rounded p-1.5 text-text-faint hover:bg-surface-3 hover:text-text">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="ml-auto rounded p-1.5 text-text-faint hover:bg-danger-soft hover:text-danger">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function PromptEditor({
  prompt,
  onClose,
  onSave,
}: {
  prompt: Prompt | null;
  onClose: () => void;
  onSave: (data: { name: string; content: string; category: string; tags: string[] }) => void;
}) {
  const [name, setName] = useState(prompt?.name || "");
  const [content, setContent] = useState(prompt?.content || "");
  const [category, setCategory] = useState(prompt?.category || "通用");
  const [tagsStr, setTagsStr] = useState((prompt?.tags || []).join(", "));

  const save = () => {
    if (!name.trim() || !content.trim()) return;
    onSave({
      name: name.trim(),
      content,
      category: category.trim() || "通用",
      tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <Modal open onClose={onClose} title={prompt ? "编辑提示词" : "新建提示词"} wide>
      <div className="space-y-3 p-5">
        <Field label="名称">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="如：代码审查专家" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="分类">
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
          </Field>
          <Field label="标签（逗号分隔）">
            <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="提示词内容">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={9}
            className={cn(inputCls, "resize-none font-mono text-xs")}
            placeholder="输入提示词…"
          />
        </Field>
        {prompt && prompt.versions.length > 0 && (
          <details className="rounded-lg border border-border bg-surface-2 p-2 text-xs">
            <summary className="cursor-pointer text-text-muted">版本历史（{prompt.versions.length}）</summary>
            <div className="mt-2 space-y-1">
              {prompt.versions.map((v) => (
                <div key={v.version} className="flex items-center justify-between rounded px-2 py-1 text-[11px] text-text-faint">
                  <span>v{v.version} · {new Date(v.createdAt).toLocaleString("zh-CN")}</span>
                  <button
                    onClick={() => setContent(v.content)}
                    className="flex items-center gap-1 text-accent hover:underline"
                  >
                    <RotateCcw size={10} /> 恢复
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={save} disabled={!name.trim() || !content.trim()}>
            <Save size={15} /> {prompt ? "保存为新版本" : "创建"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
