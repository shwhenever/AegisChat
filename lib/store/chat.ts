// ============================================================
// Chat store — conversations, streaming, safety, persistence.
// ============================================================

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Attachment, Conversation, Message } from "../types";
import { idbGet, idbSet, idbDel, K } from "../db";
import { streamChat } from "../chat-client";
import { analyzePromptRisk } from "../safety";
import { estimateCost } from "../pricing";
import { useVaultStore } from "./vault";
import { useSettingsStore } from "./settings";
import { useUsageStore } from "./usage";
import { titleFromText } from "../utils";

let abortController: AbortController | null = null;

async function persistConv(conv: Conversation) {
  await idbSet(K.conversation(conv.id), conv);
  const index = (await idbGet<string[]>(K.conversationIndex, [])) || [];
  if (!index.includes(conv.id)) await idbSet(K.conversationIndex, [conv.id, ...index]);
}

function pickDefault(): { providerId: string; model: string } | null {
  const vault = useVaultStore.getState();
  const settings = useSettingsStore.getState().settings;
  const enabled = vault.providers.filter((p) => p.enabled);
  if (settings.defaultProviderId) {
    const p = vault.providers.find((x) => x.id === settings.defaultProviderId);
    if (p && p.models.length) return { providerId: p.id, model: settings.defaultModel || p.models[0] };
  }
  for (const p of enabled) if (p.models.length) return { providerId: p.id, model: p.models[0] };
  for (const p of vault.providers) if (p.models.length) return { providerId: p.id, model: p.models[0] };
  return vault.providers.length ? { providerId: vault.providers[0].id, model: vault.providers[0].models[0] || "" } : null;
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  hydrated: boolean;
  streaming: boolean;
  hydrate: () => Promise<void>;
  activeConversation: () => Conversation | undefined;
  newConversation: () => string | null;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setConversationModel: (id: string, providerId: string, model: string) => Promise<void>;
  setSystemPrompt: (id: string, prompt: string) => Promise<void>;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  regenerate: (assistantMessageId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  stopStreaming: () => void;
}

function updateConv(set: any, get: any, id: string, fn: (c: Conversation) => Conversation, persist = true) {
  const convs = get().conversations.map((c: Conversation) => (c.id === id ? fn(c) : c));
  set({ conversations: convs });
  const updated = convs.find((c: Conversation) => c.id === id);
  if (persist && updated) void persistConv(updated);
  return updated;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  hydrated: false,
  streaming: false,

  hydrate: async () => {
    if (get().hydrated || typeof window === "undefined") return;
    const index = (await idbGet<string[]>(K.conversationIndex, [])) || [];
    const convs: Conversation[] = [];
    for (const id of index) {
      const c = await idbGet<Conversation>(K.conversation(id));
      if (c) convs.push(c);
    }
    convs.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
    set({ conversations: convs, hydrated: true });
  },

  activeConversation: () => get().conversations.find((c) => c.id === get().activeId),

  newConversation: () => {
    const pick = pickDefault();
    const conv: Conversation = {
      id: nanoid(10),
      title: "新对话",
      messages: [],
      providerId: pick?.providerId || "",
      model: pick?.model || "",
      systemPrompt: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    void persistConv(conv);
    set({ conversations: [conv, ...get().conversations], activeId: conv.id });
    return conv.id;
  },

  selectConversation: (id) => set({ activeId: id }),

  deleteConversation: async (id) => {
    await idbDel(K.conversation(id));
    const index = (await idbGet<string[]>(K.conversationIndex, [])) || [];
    await idbSet(K.conversationIndex, index.filter((i) => i !== id));
    await useUsageStore.getState().removeByConversation(id);
    const remaining = get().conversations.filter((c) => c.id !== id);
    set({
      conversations: remaining,
      activeId: get().activeId === id ? remaining[0]?.id || null : get().activeId,
    });
  },

  renameConversation: async (id, title) => {
    updateConv(set, get, id, (c) => ({ ...c, title, updatedAt: Date.now() }));
  },

  togglePin: async (id) => {
    const updated = updateConv(set, get, id, (c) => ({ ...c, pinned: !c.pinned }));
    if (updated) {
      const convs = get()
        .conversations.slice()
        .sort((a: Conversation, b: Conversation) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
      set({ conversations: convs });
    }
  },

  clearAll: async () => {
    const index = (await idbGet<string[]>(K.conversationIndex, [])) || [];
    for (const id of index) await idbDel(K.conversation(id));
    await idbSet(K.conversationIndex, []);
    set({ conversations: [], activeId: null });
  },

  setConversationModel: async (id, providerId, model) => {
    updateConv(set, get, id, (c) => ({ ...c, providerId, model, updatedAt: Date.now() }));
  },

  setSystemPrompt: async (id, prompt) => {
    updateConv(set, get, id, (c) => ({ ...c, systemPrompt: prompt, updatedAt: Date.now() }));
  },

  sendMessage: async (text, attachments) => {
    let convId = get().activeId;
    if (!convId || !get().conversations.find((c) => c.id === convId)) {
      convId = get().newConversation();
    }
    if (!convId) return;
    const settings = useSettingsStore.getState().settings;

    // Build user message
    let content = text.trim();
    const textAtts = (attachments || []).filter((a) => a.text);
    if (textAtts.length) {
      content += "\n\n" + textAtts.map((a) => "```" + (a.name.split(".").pop() || "") + "\n" + a.text + "\n```").join("\n\n");
    }
    const images = (attachments || []).filter((a) => a.type.startsWith("image/")).map((a) => a.data!).filter(Boolean);

    const userMsg: Message = {
      id: nanoid(10),
      role: "user",
      content,
      createdAt: Date.now(),
      attachments,
    };

    // Safety analysis on the user's input
    if (settings.safetyMode !== "off") {
      const risk = analyzePromptRisk(content);
      if (risk.level !== "safe") userMsg.risk = risk;
    }

    let conv = updateConv(set, get, convId, (c) => {
      const title = c.messages.length === 0 ? titleFromText(content) : c.title;
      return { ...c, title, messages: [...c.messages, userMsg], updatedAt: Date.now() };
    })!;

    // Strict mode may block
    if (settings.safetyMode === "strict" && userMsg.risk?.level === "danger") {
      const errMsg: Message = {
        id: nanoid(10),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        error: `安全护盾已拦截：检测到高风险提示注入（${userMsg.risk.reasons.join("、")}）`,
      };
      updateConv(set, get, convId, (c) => ({ ...c, messages: [...c.messages, errMsg] }));
      return;
    }

    await streamAssistant(conv);
  },

  regenerate: async (assistantMessageId) => {
    const conv = get().activeConversation();
    if (!conv) return;
    const idx = conv.messages.findIndex((m) => m.id === assistantMessageId);
    if (idx < 0) return;
    // Remove this assistant message (and anything after) then re-stream.
    const trimmed = { ...conv, messages: conv.messages.slice(0, idx), updatedAt: Date.now() };
    set({ conversations: get().conversations.map((c) => (c.id === conv.id ? trimmed : c)) });
    await persistConv(trimmed);
    await streamAssistant(trimmed);
  },

  editMessage: async (messageId, content) => {
    const conv = get().activeConversation();
    if (!conv) return;
    const idx = conv.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    // Truncate to & including the edited user message, set new content, re-stream.
    const edited = { ...conv.messages[idx], content: content.trim() };
    const trimmed = { ...conv, messages: [...conv.messages.slice(0, idx), edited], updatedAt: Date.now() };
    set({ conversations: get().conversations.map((c) => (c.id === conv.id ? trimmed : c)) });
    await persistConv(trimmed);
    await streamAssistant(trimmed);
  },

  deleteMessage: async (messageId) => {
    const conv = get().activeConversation();
    if (!conv) return;
    const trimmed = { ...conv, messages: conv.messages.filter((m) => m.id !== messageId), updatedAt: Date.now() };
    set({ conversations: get().conversations.map((c) => (c.id === conv.id ? trimmed : c)) });
    await persistConv(trimmed);
  },

  stopStreaming: () => {
    abortController?.abort();
    abortController = null;
    set({ streaming: false });
  },
}));

// ---- core streaming routine ----
async function streamAssistant(conv: Conversation) {
  const set = useChatStore.setState;
  const get = useChatStore.getState;
  const vault = useVaultStore.getState();
  const settings = useSettingsStore.getState().settings;

  const provider = vault.providers.find((p) => p.id === conv.providerId) || vault.providers.find((p) => p.enabled);
  if (!provider) {
    const errMsg: Message = {
      id: nanoid(10),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      error: "未配置可用供应商，请在设置中添加 API 密钥。",
    };
    updateConv(set, get, conv.id, (c) => ({ ...c, messages: [...c.messages, errMsg] }));
    return;
  }
  if (!provider.apiKey && provider.preset !== "ollama") {
    const errMsg: Message = {
      id: nanoid(10),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      error: `供应商「${provider.name}」尚未填写 API 密钥，请前往设置填写。`,
    };
    updateConv(set, get, conv.id, (c) => ({ ...c, messages: [...c.messages, errMsg] }));
    return;
  }

  const model = conv.model || provider.models[0] || "";
  if (!model) {
    const errMsg: Message = { id: nanoid(10), role: "assistant", content: "", createdAt: Date.now(), error: "未选择模型。" };
    updateConv(set, get, conv.id, (c) => ({ ...c, messages: [...c.messages, errMsg] }));
    return;
  }

  const assistantId = nanoid(10);
  const placeholder: Message = {
    id: assistantId,
    role: "assistant",
    content: "",
    model,
    providerId: provider.id,
    createdAt: Date.now(),
    pending: true,
  };
  updateConv(set, get, conv.id, (c) => ({ ...c, messages: [...c.messages, placeholder] }), false);

  // Build payload from history (exclude the pending placeholder)
  const history = conv.messages
    .filter((m) => !m.error)
    .map((m) => ({
      role: m.role,
      content: m.content,
      images: m.attachments?.filter((a) => a.type.startsWith("image/")).map((a) => a.data!).filter(Boolean),
    }));

  abortController = new AbortController();
  set({ streaming: true });
  const startTs = Date.now();
  let redactionCount = 0;

  await streamChat(
    {
      engine: provider.engine,
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      model,
      messages: history,
      system: conv.systemPrompt || undefined,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      redact: settings.redactOutput,
      safety: settings.safetyMode,
      signal: abortController.signal,
    },
    {
      onDelta: (text) => {
        updateConv(set, get, conv.id, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m)),
        }), false);
      },
      onRedaction: (r) => {
        redactionCount += r.count;
      },
      onUsage: (u) => {
        const cost = estimateCost(model, u.prompt, u.completion);
        updateConv(set, get, conv.id, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantId ? { ...m, usage: { ...u, cost, durationMs: Date.now() - startTs } } : m
          ),
        }), false);
        // record usage ledger
        void useUsageStore.getState().addRecord({
          id: nanoid(10),
          conversationId: conv.id,
          providerId: provider.id,
          providerName: provider.name,
          model,
          prompt: u.prompt,
          completion: u.completion,
          cost,
          timestamp: Date.now(),
        });
      },
      onError: (message) => {
        updateConv(set, get, conv.id, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantId ? { ...m, error: message, pending: false } : m)),
        }), false);
      },
      onDone: () => {
        const finalConv = updateConv(set, get, conv.id, (c) => ({
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map((m) =>
            m.id === assistantId
              ? { ...m, pending: false, redactions: redactionCount || m.redactions }
              : m
          ),
        }));
        if (finalConv) void persistConv(finalConv);
        set({ streaming: false });
        abortController = null;
      },
    }
  );
}
