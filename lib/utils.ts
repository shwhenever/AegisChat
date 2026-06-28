import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, digits = 1): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(digits) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(digits) + "K";
  return String(Math.round(n));
}

export function formatCost(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  const day = 86_400_000;
  if (diff < day && d.getDate() === new Date(now).getDate()) {
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 2 * day) return "昨天";
  if (diff < 7 * day) return d.toLocaleDateString("zh-CN", { weekday: "short" });
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = 60_000, h = 3_600_000, d = 86_400_000;
  if (diff < m) return "刚刚";
  if (diff < h) return Math.floor(diff / m) + " 分钟前";
  if (diff < d) return Math.floor(diff / h) + " 小时前";
  if (diff < 7 * d) return Math.floor(diff / d) + " 天前";
  return new Date(ts).toLocaleDateString("zh-CN");
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function titleFromText(text: string, max = 28): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "新对话";
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}
