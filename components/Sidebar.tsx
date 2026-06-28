"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  GitCompareArrows,
  Library,
  BarChart3,
  Settings,
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Lock,
  Sun,
  Moon,
  Check,
  X,
} from "lucide-react";
import { useChatStore } from "@/lib/store/chat";
import { useSettingsStore } from "@/lib/store/settings";
import { useVaultStore } from "@/lib/store/vault";
import { Wordmark } from "./Logo";
import { cn, relativeTime } from "@/lib/utils";
import { Badge } from "./ui";

const NAV = [
  { href: "/", label: "对话", icon: MessageSquare },
  { href: "/spectrum", label: "Spectrum 对比", icon: GitCompareArrows },
  { href: "/library", label: "提示词库", icon: Library },
  { href: "/insights", label: "用量洞察", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const select = useChatStore((s) => s.selectConversation);
  const newConv = useChatStore((s) => s.newConversation);
  const [q, setQ] = useState("");

  const filtered = conversations.filter(
    (c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.messages.some((m) => m.content.toLowerCase().includes(q.toLowerCase()))
  );
  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  const handleNew = () => {
    newConv();
    router.push("/");
    onNavigate?.();
  };

  const handleSelect = (id: string) => {
    select(id);
    router.push("/");
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3.5">
        <Wordmark />
      </div>

      <div className="px-3">
        <button
          onClick={handleNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-accent-fg transition hover:brightness-110 shadow-[0_6px_20px_-8px_var(--accent)]"
        >
          <Plus size={16} /> 新建对话
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索对话…"
            className="w-full rounded-lg bg-surface-2 border border-border py-2 pl-8 pr-2 text-xs text-text placeholder:text-text-faint outline-none focus:border-accent/50"
          />
        </div>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-text-faint">
            {conversations.length === 0 ? "还没有对话" : "无匹配结果"}
          </div>
        )}
        {pinned.length > 0 && (
          <div className="mb-1 px-2 pt-1 text-[10px] font-medium uppercase tracking-wide text-text-faint">置顶</div>
        )}
        {pinned.map((c) => (
          <ConvItem key={c.id} conv={c} active={c.id === activeId} onSelect={() => handleSelect(c.id)} />
        ))}
        {pinned.length > 0 && rest.length > 0 && (
          <div className="mb-1 px-2 pt-2 text-[10px] font-medium uppercase tracking-wide text-text-faint">最近</div>
        )}
        {rest.map((c) => (
          <ConvItem key={c.id} conv={c} active={c.id === activeId} onSelect={() => handleSelect(c.id)} />
        ))}
      </div>

      <nav className="border-t border-border p-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2 hover:text-text"
              )}
            >
              <Icon size={16} />
              {item.label}
              {item.href === "/spectrum" && (
                <Badge tone="accent" className="ml-auto">
                  新
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function ConvItem({
  conv,
  active,
  onSelect,
}: {
  conv: { id: string; title: string; updatedAt: number; pinned?: boolean; messages: { content: string }[] };
  active: boolean;
  onSelect: () => void;
}) {
  const rename = useChatStore((s) => s.renameConversation);
  const del = useChatStore((s) => s.deleteConversation);
  const togglePin = useChatStore((s) => s.togglePin);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(conv.title);

  const save = () => {
    if (val.trim()) rename(conv.id, val.trim());
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative mb-0.5 rounded-lg px-2.5 py-2 transition",
        active ? "bg-surface-2" : "hover:bg-surface-2/60"
      )}
    >
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            autoFocus
            className="w-full rounded bg-surface-3 px-1.5 py-0.5 text-xs text-text outline-none ring-1 ring-accent/40"
          />
          <button onClick={save} className="text-accent">
            <Check size={13} />
          </button>
          <button onClick={() => setEditing(false)} className="text-text-faint">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button onClick={onSelect} className="block w-full text-left">
          <div className={cn("truncate text-[13px]", active ? "text-text font-medium" : "text-text-muted")}>
            {conv.title}
          </div>
          <div className="truncate text-[10px] text-text-faint">
            {relativeTime(conv.updatedAt)}
            {conv.messages.length > 0 && ` · ${conv.messages.length} 条`}
          </div>
        </button>
      )}

      {!editing && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 rounded-md bg-surface-3/90 px-0.5 backdrop-blur">
          <button
            onClick={() => togglePin(conv.id)}
            title={conv.pinned ? "取消置顶" : "置顶"}
            className="rounded p-1 text-text-faint hover:text-text"
          >
            {conv.pinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            onClick={() => {
              setVal(conv.title);
              setEditing(true);
            }}
            title="重命名"
            className="rounded p-1 text-text-faint hover:text-text"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => {
              if (confirm("删除此对话？")) del(conv.id);
            }}
            title="删除"
            className="rounded p-1 text-text-faint hover:text-danger"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export function SidebarFooter() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const lock = useVaultStore((s) => s.lock);
  return (
    <div className="flex items-center gap-1 border-t border-border px-3 py-2.5">
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-text-muted hover:bg-surface-2 hover:text-text transition"
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        {theme === "dark" ? "浅色" : "深色"}
      </button>
      <button
        onClick={lock}
        className="ml-auto flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-text-muted hover:bg-danger-soft hover:text-danger transition"
      >
        <Lock size={14} />
        锁定
      </button>
    </div>
  );
}
