// ============================================================
// Usage store — token & cost ledger, persisted to IndexedDB.
// ============================================================

import { create } from "zustand";
import type { UsageRecord } from "../types";
import { idbGet, idbSet, idbDel, K } from "../db";

interface UsageState {
  records: UsageRecord[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addRecord: (r: UsageRecord) => Promise<void>;
  clear: () => Promise<void>;
  removeByConversation: (conversationId: string) => Promise<void>;
}

export const useUsageStore = create<UsageState>((set, get) => ({
  records: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated || typeof window === "undefined") return;
    const index = (await idbGet<string[]>(K.usageIndex, [])) || [];
    const records: UsageRecord[] = [];
    for (const id of index) {
      const r = await idbGet<UsageRecord>(K.usage(id));
      if (r) records.push(r);
    }
    records.sort((a, b) => b.timestamp - a.timestamp);
    set({ records, hydrated: true });
  },
  addRecord: async (r) => {
    await idbSet(K.usage(r.id), r);
    const index = (await idbGet<string[]>(K.usageIndex, [])) || [];
    await idbSet(K.usageIndex, [r.id, ...index]);
    set({ records: [r, ...get().records].slice(0, 5000) });
  },
  clear: async () => {
    const index = (await idbGet<string[]>(K.usageIndex, [])) || [];
    for (const id of index) await idbDel(K.usage(id));
    await idbSet(K.usageIndex, []);
    set({ records: [] });
  },
  removeByConversation: async (conversationId) => {
    const remaining = get().records.filter((r) => r.conversationId !== conversationId);
    const removed = get().records.filter((r) => r.conversationId === conversationId);
    for (const r of removed) await idbDel(K.usage(r.id));
    await idbSet(K.usageIndex, remaining.map((r) => r.id));
    set({ records: remaining });
  },
}));

// ---- derived selectors ----
export function usageStats(records: UsageRecord[]) {
  let cost = 0;
  let prompt = 0;
  let completion = 0;
  const byModel = new Map<string, { cost: number; count: number; tokens: number }>();
  const byProvider = new Map<string, { cost: number; count: number }>();
  const byDay = new Map<string, { cost: number; tokens: number }>();
  for (const r of records) {
    cost += r.cost;
    prompt += r.prompt;
    completion += r.completion;
    const m = byModel.get(r.model) || { cost: 0, count: 0, tokens: 0 };
    m.cost += r.cost;
    m.count += 1;
    m.tokens += r.prompt + r.completion;
    byModel.set(r.model, m);
    const p = byProvider.get(r.providerName) || { cost: 0, count: 0 };
    p.cost += r.cost;
    p.count += 1;
    byProvider.set(r.providerName, p);
    const day = new Date(r.timestamp).toISOString().slice(0, 10);
    const d = byDay.get(day) || { cost: 0, tokens: 0 };
    d.cost += r.cost;
    d.tokens += r.prompt + r.completion;
    byDay.set(day, d);
  }
  return {
    cost,
    prompt,
    completion,
    total: prompt + completion,
    requests: records.length,
    byModel: Array.from(byModel.entries()).sort((a, b) => b[1].cost - a[1].cost),
    byProvider: Array.from(byProvider.entries()).sort((a, b) => b[1].cost - a[1].cost),
    byDay: Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0])),
  };
}
