"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Lock, KeyRound, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useVaultStore } from "@/lib/store/vault";
import { passwordStrength } from "@/lib/crypto";
import { Logo } from "./Logo";
import { Button, inputCls } from "./ui";
import { cn } from "@/lib/utils";

export function VaultGate() {
  const { initialized, locked, busy, error, createVault, unlock, hydrate } = useVaultStore();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "unlock">("unlock");

  // Web Crypto (crypto.subtle) requires a secure context (HTTPS or localhost).
  const noCrypto = typeof window !== "undefined" && (!window.crypto || !window.crypto.subtle);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setMode(initialized ? "unlock" : "create");
  }, [initialized]);

  const strength = passwordStrength(pw);

  const submit = async () => {
    setLocalErr(null);
    if (mode === "create") {
      if (pw.length < 8) return setLocalErr("主密码至少需要 8 位");
      if (pw !== confirm) return setLocalErr("两次输入的密码不一致");
      try {
        await createVault(pw);
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : "创建失败");
      }
    } else {
      try {
        await unlock(pw);
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : "解锁失败");
      }
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !busy) submit();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent-soft blur-[120px]" />
      </div>

      <div className="w-full max-w-md aegis-rise">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="shield-ring mb-4 rounded-2xl bg-surface/60 p-3">
            <Logo size={44} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            <span className="text-grad">Aegis</span>
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            安全为先的 AI 客户端 · 零知识加密密钥保险库
          </p>
        </div>

        <div className="glass rounded-2xl border border-border-strong p-6 shadow-[var(--shadow)]">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              {mode === "create" ? <ShieldCheck size={18} /> : <Lock size={18} />}
            </div>
            <div>
              <div className="text-sm font-semibold">
                {mode === "create" ? "创建加密保险库" : "解锁保险库"}
              </div>
              <div className="text-[11px] text-text-faint">
                {mode === "create"
                  ? "设置主密码以加密所有 API 密钥"
                  : "输入主密码访问你的供应商配置"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {noCrypto && (
              <div className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2.5 text-xs text-warn">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  当前环境不支持 Web Crypto API（需要 HTTPS 或 localhost 安全上下文）。
                  请通过 HTTPS 访问，或在本地以 localhost 打开。部署至 Vercel 后将自动获得 HTTPS。
                </span>
              </div>
            )}
            <div className="relative">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={onKey}
                placeholder="主密码"
                autoFocus
                className={cn(inputCls, "pl-9 pr-10")}
              />
              <button
                onClick={() => setShow((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
                tabIndex={-1}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === "create" && pw.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        i <= strength.score
                          ? strength.score <= 1
                            ? "bg-danger"
                            : strength.score <= 2
                            ? "bg-warn"
                            : "bg-accent"
                          : "bg-surface-3"
                      )}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-text-faint">
                  强度：{strength.label} · {strength.hint}
                </div>
              </div>
            )}

            {mode === "create" && (
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={onKey}
                placeholder="确认主密码"
                className={inputCls}
              />
            )}

            {(localErr || error) && (
              <div className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
                <AlertTriangle size={14} />
                {localErr || error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={submit}
              disabled={busy || !pw}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> 处理中…
                </>
              ) : mode === "create" ? (
                "创建并进入"
              ) : (
                "解锁"
              )}
            </Button>
          </div>

          <div className="mt-5 space-y-2 rounded-xl border border-border bg-surface-2/60 p-3.5">
            {[
              ["AES-256-GCM 加密", "主密码经 PBKDF2 派生密钥，本地加密存储"],
              ["零知识架构", "密钥仅在浏览器内存解密，服务端永不持久化"],
              ["传输即用即弃", "密钥仅随请求经 HTTPS 临时转发，用后即弃"],
            ].map(([t, d]) => (
              <div key={t} className="flex items-start gap-2.5">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <div className="text-[12px] font-medium text-text">{t}</div>
                  <div className="text-[11px] text-text-faint">{d}</div>
                </div>
              </div>
            ))}
          </div>

          {mode === "unlock" && (
            <button
              onClick={() => {
                if (confirm2()) useVaultStore.getState().resetVault();
              }}
              className="mt-4 w-full text-center text-[11px] text-text-faint hover:text-danger transition"
            >
              忘记主密码？重置保险库（将清除全部本地数据）
            </button>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-text-faint">
          Aegis 不收集任何数据 · 所有对话与配置仅存储于本设备
        </p>
      </div>
    </div>
  );
}

function confirm2() {
  return window.confirm("确定重置保险库？这将清除所有已加密的供应商密钥与本地数据，且不可恢复。");
}
