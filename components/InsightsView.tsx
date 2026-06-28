"use client";

import { useMemo } from "react";
import { BarChart3, Coins, Zap, Hash, TrendingUp, Trash2, Cpu } from "lucide-react";
import { useUsageStore, usageStats } from "@/lib/store/usage";
import { EmptyState, Button } from "./ui";
import { cn, formatCost, formatNumber } from "@/lib/utils";

export function InsightsView() {
  const records = useUsageStore((s) => s.records);
  const clear = useUsageStore((s) => s.clear);
  const stats = useMemo(() => usageStats(records), [records]);

  const maxModelCost = Math.max(1, ...stats.byModel.map((m) => m[1].cost));
  const maxProviderCost = Math.max(1, ...stats.byProvider.map((p) => p[1].cost));
  const maxDayTokens = Math.max(1, ...stats.byDay.map((d) => d[1].tokens));

  // last 14 days
  const last14 = useMemo(() => {
    const map = new Map(stats.byDay);
    const out: { day: string; cost: number; tokens: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const v = map.get(d) || { cost: 0, tokens: 0 };
      out.push({ day: d, ...v });
    }
    return out;
  }, [stats.byDay]);
  const maxDayCost = Math.max(1, ...last14.map((d) => d.cost));

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <BarChart3 size={17} />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold">用量洞察</h2>
            <p className="text-[11px] text-text-faint">Token 与成本分析，数据仅存于本地</p>
          </div>
        </div>
        {records.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { if (confirm("清空用量记录？")) clear(); }}>
            <Trash2 size={14} /> 清空
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {records.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={36} />}
            title="还没有用量数据"
            desc="发送消息后，这里会自动统计每个模型与供应商的 Token 用量与估算成本。"
          />
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={<Coins size={16} />} label="总成本" value={formatCost(stats.cost)} accent />
              <Kpi icon={<Hash size={16} />} label="请求次数" value={formatNumber(stats.requests, 0)} />
              <Kpi icon={<Zap size={16} />} label="输入 Token" value={formatNumber(stats.prompt)} />
              <Kpi icon={<Zap size={16} />} label="输出 Token" value={formatNumber(stats.completion)} />
            </div>

            {/* daily chart */}
            <Card title="近 14 天成本趋势">
              <div className="flex h-40 items-end gap-1">
                {last14.map((d) => (
                  <div key={d.day} className="group relative flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-accent/40 to-accent transition-all"
                      style={{ height: `${(d.cost / maxDayCost) * 100}%`, minHeight: d.cost > 0 ? 3 : 0 }}
                    />
                    <div className="pointer-events-none absolute -top-7 hidden rounded bg-surface-3 px-1.5 py-0.5 text-[9px] text-text group-hover:block">
                      {formatCost(d.cost)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-text-faint">
                <span>{last14[0]?.day.slice(5)}</span>
                <span>今天</span>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* by model */}
              <Card title="按模型成本" icon={<Cpu size={14} />}>
                <div className="space-y-2">
                  {stats.byModel.slice(0, 8).map(([model, m]) => (
                    <div key={model}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="truncate font-mono text-text-muted">{model}</span>
                        <span className="ml-2 shrink-0 text-text">{formatCost(m.cost)} · {m.count}次</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${(m.cost / maxModelCost) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* by provider */}
              <Card title="按供应商成本">
                <div className="space-y-2">
                  {stats.byProvider.map(([name, p]) => (
                    <div key={name}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="truncate text-text-muted">{name}</span>
                        <span className="ml-2 shrink-0 text-text">{formatCost(p.cost)} · {p.count}次</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-accent-2" style={{ width: `${(p.cost / maxProviderCost) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* daily tokens */}
            <Card title="近 14 天 Token 用量">
              <div className="flex h-32 items-end gap-1">
                {last14.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t bg-accent-2/60"
                      style={{ height: `${(d.tokens / maxDayTokens) * 100}%`, minHeight: d.tokens > 0 ? 3 : 0 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-text-faint">
                <span>{last14[0]?.day.slice(5)}</span>
                <span>今天</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", accent ? "border-accent/30 bg-accent-soft" : "border-border bg-surface-2")}>
      <div className={cn("mb-1.5 flex items-center gap-1.5 text-[11px]", accent ? "text-accent" : "text-text-faint")}>
        {icon} {label}
      </div>
      <div className="font-display text-2xl font-bold text-text">{value}</div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-muted">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
