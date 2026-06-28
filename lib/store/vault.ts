// ============================================================
// Vault store — encrypted key vault + provider configuration.
// Master password is held in memory only during an unlocked session
// (never persisted) so providers can be re-sealed on change.
// ============================================================

import { create } from "zustand";
import type { ProviderConfig } from "../types";
import {
  loadSealedVault,
  saveSealedVault,
  sealVault,
  openVault,
  reseedVault,
  destroyVault,
  secureWipe,
  type Sealed,
} from "../crypto";
import { PROVIDER_PRESETS, presetToProvider, createCustomProvider } from "../providers";
import type { VaultBlob } from "../types";

interface VaultState {
  sealed: Sealed | null;
  initialized: boolean; // a vault exists on disk
  locked: boolean;
  providers: ProviderConfig[]; // decrypted, in memory
  sessionPassword: string | null; // in-memory only
  error: string | null;
  busy: boolean;

  hydrate: () => void;
  createVault: (password: string, providers?: ProviderConfig[]) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  resetVault: () => void;
  changePassword: (oldPw: string, newPw: string) => Promise<void>;

  addPreset: (presetId: string) => void;
  addCustom: () => void;
  updateProvider: (id: string, patch: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;
  getProvider: (id: string) => ProviderConfig | undefined;
  _persist: () => Promise<void>;
}

function seedProviders(): ProviderConfig[] {
  return ["openai", "anthropic", "google"]
    .map((id) => PROVIDER_PRESETS.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => presetToProvider(p!));
}

export const useVaultStore = create<VaultState>((set, get) => ({
  sealed: null,
  initialized: false,
  locked: true,
  providers: [],
  sessionPassword: null,
  error: null,
  busy: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    const sealed = loadSealedVault();
    set({ sealed, initialized: !!sealed });
  },

  createVault: async (password, providers) => {
    set({ busy: true, error: null });
    try {
      const blob: VaultBlob = { providers: providers ?? seedProviders() };
      const sealed = await sealVault(password, blob);
      saveSealedVault(sealed);
      set({
        sealed,
        initialized: true,
        locked: false,
        providers: blob.providers,
        sessionPassword: password,
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : "创建失败" });
      throw e;
    }
  },

  unlock: async (password) => {
    set({ busy: true, error: null });
    const sealed = get().sealed;
    if (!sealed) {
      set({ busy: false, error: "未找到保险库" });
      throw new Error("未找到保险库");
    }
    try {
      const blob = await openVault<VaultBlob>(password, sealed);
      set({
        locked: false,
        providers: blob.providers || [],
        sessionPassword: password,
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : "解锁失败" });
      throw e;
    }
  },

  lock: () => {
    const { providers, sessionPassword } = get();
    // best-effort wipe of in-memory secrets
    providers.forEach((p) => secureWipe(p as unknown as Record<string, unknown>));
    if (sessionPassword) {
      // overwrite reference; JS strings are immutable, but we drop our handle
    }
    set({ locked: true, providers: [], sessionPassword: null, error: null });
  },

  resetVault: () => {
    destroyVault();
    set({
      sealed: null,
      initialized: false,
      locked: true,
      providers: [],
      sessionPassword: null,
      error: null,
    });
  },

  changePassword: async (oldPw, newPw) => {
    set({ busy: true, error: null });
    const sealed = get().sealed;
    if (!sealed) {
      set({ busy: false, error: "未找到保险库" });
      throw new Error("未找到保险库");
    }
    try {
      const { sealed: resealed, data } = await reseedVault<VaultBlob>(oldPw, newPw, sealed);
      saveSealedVault(resealed);
      set({
        sealed: resealed,
        providers: data.providers || [],
        sessionPassword: newPw,
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : "修改失败" });
      throw e;
    }
  },

  addPreset: (presetId) => {
    const preset = PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const providers = [...get().providers, presetToProvider(preset)];
    set({ providers });
    void get()._persist();
  },

  addCustom: () => {
    const providers = [...get().providers, createCustomProvider()];
    set({ providers });
    void get()._persist();
  },

  updateProvider: (id, patch) => {
    const providers = get().providers.map((p) => (p.id === id ? { ...p, ...patch } : p));
    set({ providers });
    void get()._persist();
  },

  removeProvider: (id) => {
    const providers = get().providers.filter((p) => p.id !== id);
    set({ providers });
    void get()._persist();
  },

  getProvider: (id) => get().providers.find((p) => p.id === id),

  // internal: re-seal with the in-memory session password
  _persist: async () => {
    const { sealed, sessionPassword, providers } = get();
    if (!sealed || !sessionPassword) return;
    try {
      const resealed = await sealVault(sessionPassword, { providers } as VaultBlob, sealed.salt);
      saveSealedVault(resealed);
      set({ sealed: resealed });
    } catch {
      /* ignore transient persist errors */
    }
  },
}));
