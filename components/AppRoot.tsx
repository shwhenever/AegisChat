"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useVaultStore } from "@/lib/store/vault";
import { useSettingsStore } from "@/lib/store/settings";
import { useChatStore } from "@/lib/store/chat";
import { usePromptStore } from "@/lib/store/prompts";
import { useUsageStore } from "@/lib/store/usage";
import { VaultGate } from "./VaultGate";
import { Sidebar, SidebarFooter } from "./Sidebar";
import { cn } from "@/lib/utils";

export function AppRoot({ children }: { children: React.ReactNode }) {
  const initialized = useVaultStore((s) => s.initialized);
  const locked = useVaultStore((s) => s.locked);
  const hydrateVault = useVaultStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    hydrateSettings();
    hydrateVault();
    setBooted(true);
  }, [hydrateSettings, hydrateVault]);

  // Once unlocked, load the data stores.
  useEffect(() => {
    if (!locked && initialized) {
      useChatStore.getState().hydrate();
      usePromptStore.getState().hydrate();
      useUsageStore.getState().hydrate();
    }
  }, [locked, initialized]);

  // Register service worker (production only).
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (!booted) return <div className="min-h-screen" />;
  if (!initialized || locked) return <VaultGate />;
  return <AppShell>{children}</AppShell>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-bg-elev/70 backdrop-blur md:flex">
        <div className="flex-1 overflow-hidden">
          <Sidebar />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-bg-elev shadow-2xl aegis-rise">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-2 top-3 text-text-muted hover:text-text"
            >
              <X size={18} />
            </button>
            <div className="flex-1 overflow-hidden">
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter />
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className={cn("rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-text")}
          >
            <Menu size={18} />
          </button>
          <span className="font-display text-sm font-semibold">Aegis</span>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
