// ============================================================
// Settings store — non-secret preferences persisted to localStorage.
// Available before the vault is unlocked.
// ============================================================

import { create } from "zustand";
import type { AppSettings, SafetyMode } from "../types";
import { lsGet, lsSet } from "../db";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  safetyMode: "warn",
  redactOutput: true,
  sendOnEnter: true,
  streamOutput: true,
  defaultProviderId: "",
  defaultModel: "",
  temperature: 0.7,
  maxTokens: 4096,
  density: "comfortable",
};

const KEY = "aegis:settings";

interface SettingsState {
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => void;
  update: (patch: Partial<AppSettings>) => void;
  setTheme: (theme: "dark" | "light") => void;
  setSafetyMode: (mode: SafetyMode) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    const s = { ...DEFAULT_SETTINGS, ...lsGet<Partial<AppSettings>>(KEY, {}) };
    document.documentElement.setAttribute("data-theme", s.theme);
    set({ settings: s, hydrated: true });
  },
  update: (patch) => {
    const next = { ...get().settings, ...patch };
    lsSet(KEY, next);
    if (patch.theme) document.documentElement.setAttribute("data-theme", patch.theme);
    set({ settings: next });
  },
  setTheme: (theme) => get().update({ theme }),
  setSafetyMode: (mode) => get().update({ safetyMode: mode }),
}));
