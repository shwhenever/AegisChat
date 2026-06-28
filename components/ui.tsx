"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect } from "react";

// ---- Button ----
type Variant = "primary" | "outline" | "ghost" | "subtle" | "danger" | "warn";
type Size = "sm" | "md" | "lg" | "icon";

const variantCls: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:brightness-110 shadow-[0_6px_20px_-8px_var(--accent)] border border-transparent",
  outline: "border border-border-strong bg-transparent hover:bg-surface-2 text-text",
  ghost: "bg-transparent hover:bg-surface-2 text-text-muted hover:text-text",
  subtle: "bg-surface-2 hover:bg-surface-3 text-text border border-border",
  danger: "bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30",
  warn: "bg-warn-soft text-warn hover:brightness-110 border border-warn/30",
};
const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg justify-center",
};

export function Button({
  variant = "subtle",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none",
        variantCls[variant],
        sizeCls[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---- Switch ----
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 border",
        checked ? "bg-accent border-accent" : "bg-surface-3 border-border-strong"
      )}
      aria-label={label}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}

// ---- Badge ----
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warn" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-3 text-text-muted border-border",
    accent: "bg-accent-soft text-accent border-accent/20",
    warn: "bg-warn-soft text-warn border-warn/25",
    danger: "bg-danger-soft text-danger border-danger/25",
    info: "bg-info/10 text-info border-info/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ---- Spinner ----
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent aegis-spin", className)}
    />
  );
}

// ---- Modal ----
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm aegis-rise" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full glass rounded-2xl border border-border-strong shadow-[var(--shadow)] aegis-rise",
          wide ? "max-w-3xl" : "max-w-md",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="font-display text-base font-semibold">{title}</h3>
            <button onClick={onClose} className="text-text-muted hover:text-text">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ---- Field ----
export function Field({
  label,
  hint,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      {label && <div className="text-xs font-medium text-text-muted">{label}</div>}
      {children}
      {hint && <div className="text-[11px] text-text-faint">{hint}</div>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl bg-surface-2 border border-border-strong px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition";

// ---- EmptyState ----
export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      {icon && <div className="text-text-faint">{icon}</div>}
      <div>
        <div className="font-display text-lg font-semibold text-text">{title}</div>
        {desc && <div className="mt-1 text-sm text-text-muted max-w-sm">{desc}</div>}
      </div>
      {action}
    </div>
  );
}
