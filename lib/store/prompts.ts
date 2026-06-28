// ============================================================
// Prompts store — reusable prompt library with version history.
// ============================================================

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Prompt, PromptVersion } from "../types";
import { idbGet, idbSet, idbDel, K } from "../db";

const SEED_PROMPTS: Prompt[] = [
  {
    id: "seed-1",
    name: "深度研究助理",
    category: "研究",
    tags: ["分析", "研究"],
    content:
      "你是一位严谨的研究助理。请基于用户提供的主题，输出结构化的研究简报：\n1) 核心概念与背景\n2) 关键论点（正反两面）\n3) 数据与证据缺口\n4) 可行的后续研究方向\n要求：标注不确定性，区分事实与推测，使用清晰的小标题。",
    versions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: true,
  },
  {
    id: "seed-2",
    name: "代码审查专家",
    category: "开发",
    tags: ["代码", "审查"],
    content:
      "你是一名资深代码审查专家。请审查用户提交的代码，关注：\n- 正确性与潜在 bug\n- 安全漏洞（注入、越权、密钥泄露）\n- 性能与可读性\n- 改进建议（附最小化代码示例）\n请按严重程度（高/中/低）分级输出。",
    versions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "seed-3",
    name: "结构化写作教练",
    category: "写作",
    tags: ["写作", "结构"],
    content:
      "你是一位结构化写作教练。请帮用户把零散想法整理为：明确的主张、3 条支撑论据、一个反例与回应、以及有力的结尾。保持简洁，避免空话。",
    versions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "seed-4",
    name: "苏格拉底提问者",
    category: "学习",
    tags: ["学习", "思维"],
    content:
      "你是一位苏格拉底式提问者。不要直接给出答案，而是通过一连串层层递进的问题，引导用户自己发现答案。每次只问一个问题，并在用户回答后追问下一层。",
    versions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

interface PromptState {
  prompts: Prompt[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (p: { name: string; content: string; category?: string; tags?: string[] }) => Promise<Prompt>;
  update: (id: string, patch: Partial<Prompt>) => Promise<void>;
  saveVersion: (id: string, content: string, note?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  prompts: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated || typeof window === "undefined") return;
    const index = (await idbGet<string[]>(K.promptIndex, [])) || [];
    if (index.length === 0) {
      // first run — seed
      for (const p of SEED_PROMPTS) await idbSet(K.prompt(p.id), p);
      await idbSet(K.promptIndex, SEED_PROMPTS.map((p) => p.id));
      set({ prompts: SEED_PROMPTS, hydrated: true });
      return;
    }
    const prompts: Prompt[] = [];
    for (const id of index) {
      const p = await idbGet<Prompt>(K.prompt(id));
      if (p) prompts.push(p);
    }
    prompts.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ prompts, hydrated: true });
  },
  add: async ({ name, content, category = "通用", tags = [] }) => {
    const prompt: Prompt = {
      id: nanoid(10),
      name,
      content,
      category,
      tags,
      versions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await idbSet(K.prompt(prompt.id), prompt);
    const index = (await idbGet<string[]>(K.promptIndex, [])) || [];
    await idbSet(K.promptIndex, [prompt.id, ...index]);
    set({ prompts: [prompt, ...get().prompts] });
    return prompt;
  },
  update: async (id, patch) => {
    const prompts = get().prompts.map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p
    );
    const updated = prompts.find((p) => p.id === id);
    if (updated) await idbSet(K.prompt(id), updated);
    set({ prompts });
  },
  saveVersion: async (id, content, note) => {
    const prompt = get().prompts.find((p) => p.id === id);
    if (!prompt) return;
    const version: PromptVersion = {
      version: prompt.versions.length + 1,
      content: prompt.content,
      note,
      createdAt: Date.now(),
    };
    const updated: Prompt = {
      ...prompt,
      versions: [version, ...prompt.versions],
      content,
      updatedAt: Date.now(),
    };
    await idbSet(K.prompt(id), updated);
    set({ prompts: get().prompts.map((p) => (p.id === id ? updated : p)) });
  },
  remove: async (id) => {
    await idbDel(K.prompt(id));
    const index = (await idbGet<string[]>(K.promptIndex, [])) || [];
    await idbSet(K.promptIndex, index.filter((i) => i !== id));
    set({ prompts: get().prompts.filter((p) => p.id !== id) });
  },
  toggleFavorite: async (id) => {
    const prompts = get().prompts.map((p) =>
      p.id === id ? { ...p, favorite: !p.favorite, updatedAt: Date.now() } : p
    );
    const updated = prompts.find((p) => p.id === id);
    if (updated) await idbSet(K.prompt(id), updated);
    set({ prompts });
  },
}));
