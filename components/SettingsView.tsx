"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  ShieldOff,
  Palette,
  Database,
  Server,
  Check,
  X,
  Download,
  RotateCcw,
  Lock,
  Sun,
  Moon,
} from "lucide-react";
import { useVaultStore } from "@/lib/store/vault";
import { useSettingsStore, DEFAULT_SETTINGS } from "@/lib/store/settings";
import { useChatStore } from "@/lib/store/chat";
import { useUsageStore } from "@/lib/store/usage";
import { PROVIDER_PRESETS, ENGINE_LABELS } from "@/lib/providers";
import { passwordStrength } from "@/lib/crypto";
import type { Engine, ProviderConfig, SafetyMode } from "@/lib/types";
import { Button, Field, Modal, Switch, inputCls, Badge } from "./ui";
import { cn } from "@/lib/utils";

type Tab = "providers" | "safety" | "appearance" | "data";

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("providers");
  const tabs: { id: Tab; label: string; icon: typeof Server }[] = [
    { id: "providers", label: "供应商", icon: Server },
    { id: "safety", label: "安全护盾", icon: Shield },
    { id: "appearance", label: "外观", icon: Palette },
    { id: "data", label: "数据", icon: Database },
  ];
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-3 md:px-6">
        <h2 className="font-display text-sm font-semibold">设置</h2>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-16 shrink-0 space-y-1 border-r border-border p-2 md:w-48">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition md:px-3",
                  active ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2 hover:text-text"
                )}
              >
                <Icon size={16} />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-2xl">
            {tab === "providers" && <ProvidersTab />}
            {tab === "safety" && <SafetyTab />}
            {tab === "appearance" && <AppearanceTab />}
            {tab === "data" && <DataTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Providers ----------
function ProvidersTab() {
  const providers = useVaultStore((s) => s.providers);
  const addPreset = useVaultStore((s) => s.addPreset);
  const addCustom = useVaultStore((s) => s.addCustom);
  const [addOpen, setAddOpen] = useState(false);
  const existingPresets = new Set(providers.map((p) => p.preset));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">供应商与 API 密钥</h3>
          <p className="text-xs text-text-muted">密钥经本地 AES-256 加密存储，仅在你发送请求时临时解密</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={15} /> 添加
        </Button>
      </div>

      {providers.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-sm text-text-faint">
          尚未添加供应商，点击「添加」开始
        </div>
      )}

      <div className="space-y-3">
        {providers.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="添加供应商" wide>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROVIDER_PRESETS.map((preset) => {
              const added = existingPresets.has(preset.id);
              return (
                <button
                  key={preset.id}
                  disabled={added}
                  onClick={() => {
                    addPreset(preset.id);
                    setAddOpen(false);
                  }}
                  className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface-2 p-3 text-left transition hover:border-accent/40 disabled:opacity-40"
                >
                  <span className="text-sm font-medium text-text">{preset.name}</span>
                  <span className="text-[11px] text-text-faint">{preset.description}</span>
                  <span className="mt-1 text-[10px] text-text-faint">{ENGINE_LABELS[preset.engine]}</span>
                </button>
              );
            })}
          </div>
          <Button variant="outline" className="w-full" onClick={() => { addCustom(); setAddOpen(false); }}>
            <Plus size={15} /> 添加自定义 OpenAI 兼容供应商
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ProviderCard({ provider }: { provider: ProviderConfig }) {
  const update = useVaultStore((s) => s.updateProvider);
  const remove = useVaultStore((s) => s.removeProvider);
  const [showKey, setShowKey] = useState(false);
  const [newModel, setNewModel] = useState("");

  const addModel = () => {
    const m = newModel.trim();
    if (!m || provider.models.includes(m)) return;
    update(provider.id, { models: [...provider.models, m] });
    setNewModel("");
  };

  return (
    <div className={cn("rounded-xl border bg-surface/40 p-4", provider.enabled ? "border-border" : "border-border opacity-70")}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={provider.enabled} onChange={(v) => update(provider.id, { enabled: v })} />
          <input
            value={provider.name}
            onChange={(e) => update(provider.id, { name: e.target.value })}
            className="bg-transparent text-sm font-semibold text-text outline-none"
          />
          <Badge tone="neutral">{ENGINE_LABELS[provider.engine]}</Badge>
        </div>
        <button
          onClick={() => { if (confirm(`删除供应商「${provider.name}」？`)) remove(provider.id); }}
          className="rounded-lg p-1.5 text-text-faint hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="引擎类型">
          <select
            value={provider.engine}
            onChange={(e) => update(provider.id, { engine: e.target.value as Engine })}
            className={inputCls}
          >
            <option value="openai">OpenAI 兼容</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google Gemini</option>
          </select>
        </Field>
        <Field label="API Base URL">
          <input
            value={provider.baseURL}
            onChange={(e) => update(provider.id, { baseURL: e.target.value })}
            className={cn(inputCls, "font-mono text-xs")}
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="API 密钥" hint="仅存储于本设备加密保险库，永不上传服务器">
          <div className="relative">
            <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type={showKey ? "text" : "password"}
              value={provider.apiKey}
              onChange={(e) => update(provider.id, { apiKey: e.target.value })}
              placeholder={provider.preset === "ollama" ? "本地部署无需密钥" : "sk-…"}
              className={cn(inputCls, "pl-9 pr-10 font-mono text-xs")}
            />
            <button
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-medium text-text-muted">模型列表</div>
        <div className="flex flex-wrap gap-1.5">
          {provider.models.map((m) => (
            <span key={m} className="flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-text">
              {m}
              <button onClick={() => update(provider.id, { models: provider.models.filter((x) => x !== m) })} className="text-text-faint hover:text-danger">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addModel()}
            placeholder="添加模型 ID，如 gpt-4o"
            className={cn(inputCls, "text-xs font-mono")}
          />
          <Button variant="subtle" size="sm" onClick={addModel}>
            <Plus size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Safety ----------
function SafetyTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const modes: { id: SafetyMode; label: string; desc: string; icon: typeof Shield }[] = [
    { id: "off", label: "关闭", desc: "不进行任何注入检测或脱敏", icon: ShieldOff },
    { id: "warn", label: "警告", desc: "检测提示注入并标记，自动脱敏输出", icon: Shield },
    { id: "strict", label: "严格", desc: "拦截高风险注入请求（客户端+服务端双重）", icon: ShieldAlert },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-base font-semibold">安全护盾</h3>
        <p className="text-xs text-text-muted">Aegis 的核心安全特性：提示注入检测 + 输出脱敏，全程本地运行</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = settings.safetyMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => update({ safetyMode: m.id })}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                active ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-border-strong"
              )}
            >
              <Icon size={18} className={active ? "text-accent" : "text-text-muted"} />
              <div className="mt-2 text-sm font-medium text-text">{m.label}</div>
              <div className="text-[11px] text-text-faint">{m.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3.5">
        <div>
          <div className="text-sm font-medium text-text">输出自动脱敏</div>
          <div className="text-[11px] text-text-faint">检测并遮蔽响应中泄露的密钥、令牌、私钥、信用卡等</div>
        </div>
        <Switch checked={settings.redactOutput} onChange={(v) => update({ redactOutput: v })} />
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-3.5">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-text">
          <Lock size={14} className="text-accent" /> 主密码
        </div>
        <ChangePassword />
      </div>
    </div>
  );
}

function ChangePassword() {
  const changePassword = useVaultStore((s) => s.changePassword);
  const resetVault = useVaultStore((s) => s.resetVault);
  const [old, setOld] = useState("");
  const [nw, setNw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const strength = passwordStrength(nw);

  const submit = async () => {
    setMsg(null);
    if (nw.length < 8) return setMsg({ ok: false, text: "新密码至少 8 位" });
    try {
      await changePassword(old, nw);
      setMsg({ ok: true, text: "主密码已更新" });
      setOld("");
      setNw("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "失败" });
    }
  };

  return (
    <div className="space-y-2">
      <input type="password" value={old} onChange={(e) => setOld(e.target.value)} placeholder="当前主密码" className={inputCls} />
      <input type="password" value={nw} onChange={(e) => setNw(e.target.value)} placeholder="新主密码" className={inputCls} />
      {nw && <div className="text-[11px] text-text-faint">强度：{strength.label}</div>}
      {msg && <div className={cn("text-[11px]", msg.ok ? "text-accent" : "text-danger")}>{msg.text}</div>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={submit} disabled={!old || !nw}>
          更新主密码
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm("重置保险库将清除所有供应商密钥与本地数据，且不可恢复。确定？")) resetVault();
          }}
        >
          <RotateCcw size={14} /> 重置保险库
        </Button>
      </div>
    </div>
  );
}

// ---------- Appearance ----------
function AppearanceTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-base font-semibold">外观与行为</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["dark", "light"] as const).map((t) => (
          <button
            key={t}
            onClick={() => update({ theme: t })}
            className={cn(
              "flex items-center gap-2 rounded-xl border p-3 transition",
              settings.theme === t ? "border-accent bg-accent-soft" : "border-border bg-surface-2"
            )}
          >
            {t === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            <span className="text-sm">{t === "dark" ? "深色" : "浅色"}</span>
            {settings.theme === t && <Check size={14} className="ml-auto text-accent" />}
          </button>
        ))}
      </div>

      <Row label="按 Enter 发送" desc="关闭后需点击按钮发送">
        <Switch checked={settings.sendOnEnter} onChange={(v) => update({ sendOnEnter: v })} />
      </Row>
      <Row label="流式输出" desc="逐字显示模型回复">
        <Switch checked={settings.streamOutput} onChange={(v) => update({ streamOutput: v })} />
      </Row>

      <Field label={`温度（${settings.temperature.toFixed(2)}）`} hint="越高越随机创意，越低越确定">
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={settings.temperature}
          onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </Field>
      <Field label="最大输出 Tokens" hint="单次回复的上限">
        <input
          type="number"
          min={256}
          max={32768}
          step={256}
          value={settings.maxTokens}
          onChange={(e) => update({ maxTokens: parseInt(e.target.value) || DEFAULT_SETTINGS.maxTokens })}
          className={inputCls}
        />
      </Field>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3.5">
      <div>
        <div className="text-sm font-medium text-text">{label}</div>
        {desc && <div className="text-[11px] text-text-faint">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

// ---------- Data ----------
function DataTab() {
  const conversations = useChatStore((s) => s.conversations);
  const clearAll = useChatStore((s) => s.clearAll);
  const clearUsage = useUsageStore((s) => s.clear);
  const records = useUsageStore((s) => s.records);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ conversations, exportedAt: Date.now() }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegis-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-base font-semibold">数据管理</h3>
        <p className="text-xs text-text-muted">所有数据仅存储于本设备 IndexedDB / localStorage</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-center">
          <div className="font-display text-2xl font-bold text-text">{conversations.length}</div>
          <div className="text-xs text-text-faint">对话数</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-center">
          <div className="font-display text-2xl font-bold text-text">{records.length}</div>
          <div className="text-xs text-text-faint">请求记录</div>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={exportData} disabled={conversations.length === 0}>
        <Download size={15} /> 导出全部对话 (JSON)
      </Button>

      <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
        <div className="mb-1 text-sm font-medium text-danger">危险操作</div>
        <p className="mb-3 text-[11px] text-text-faint">清除将永久删除本地数据，不可恢复</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={() => { if (confirm("清空所有对话？")) clearAll(); }}
          >
            清空对话
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => { if (confirm("清空用量记录？")) clearUsage(); }}
          >
            清空用量
          </Button>
        </div>
      </div>
    </div>
  );
}
