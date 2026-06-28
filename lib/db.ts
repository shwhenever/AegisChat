// ============================================================
// Aegis persistence — IndexedDB for larger records (conversations,
// prompts, usage), localStorage for tiny settings/vault metadata.
// ============================================================

import { createStore, get, set, del, keys } from "idb-keyval";

const store = createStore("aegis-db", "kv");

export async function idbGet<T>(key: string, def?: T): Promise<T | undefined> {
  const v = await get<T>(key, store);
  return v === undefined ? def : v;
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  return set(key, value, store);
}

export async function idbDel(key: string): Promise<void> {
  return del(key, store);
}

export async function idbAllKeys(): Promise<IDBValidKey[]> {
  return keys(store);
}

// Namespaced key helpers
export const K = {
  conversation: (id: string) => `conv:${id}`,
  prompt: (id: string) => `prompt:${id}`,
  usage: (id: string) => `usage:${id}`,
  conversationIndex: "idx:conversations",
  usageIndex: "idx:usage",
  promptIndex: "idx:prompts",
};

// ---- localStorage helpers (non-secret settings only) ----
export function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}
