![AegisChat Icon](https://raw.githubusercontent.com/shwhenever/AegisChat/refs/heads/main/icon.png)

# Aegis — 安全为先的 AI 客户端
# 一站式AI工作站

[<img src="https://vercel.com/button"  height="30">](https://vercel.com/new/clone?repository-url=https://github.com/shwhenever/AegisChat&project-name=AegisChat&repository-name=AegisChat)  [<img src="https://gitpod.io/button/open-in-gitpod.svg" alt="Open in Gitpod" height="30">](https://gitpod.io/github.com/shwhenever/AegisChat)

[中文版本](https://github.com/shwhenever/AegisChat/blob/main/README_CN.md)


> 零知识加密密钥保险库 · 多模型路由 · Spectrum 多模型对比 · 安全护盾 · 可部署于 Vercel

Aegis 是一款自托管的 AI 客户端，对标 CherryStudio / LobeChat / Chatbox，以**安全**为第一性原理。所有 API 密钥经主密码派生的 AES-256-GCM 密钥在本地加密存储，仅在发送请求时于内存中临时解密、经 HTTPS 转发后即弃。服务端为无状态 Serverless 函数，**永不持久化、永不记录**任何密钥。

---

## 核心创新

### 1. 零知识加密密钥保险库
- 主密码 → PBKDF2(SHA-256, 250,000 次迭代) → AES-GCM 256 位密钥
- 密钥以密封态（Sealed Blob）存于 `localStorage`，解密态仅存在于运行内存
- 会话锁定后立即清除内存中的明文密钥与主密码引用
- 内置密码强度计（熵估算 + 破解提示）

### 2. Spectrum 多模型对比模式
将同一条提示词**并行**发送给 2–4 个模型，并排对比回答质量、Token 用量、成本与响应时长。一键将任意结果延续到独立对话。这是 CherryStudio / LobeChat / Chatbox 均未提供的核心差异化能力。

### 3. 安全护盾（Safety Shield）
客户端 + 服务端双层防护，全程本地运行，不依赖外部服务：

| 模式 | 提示注入检测 | 输出脱敏 | 拦截行为 |
|------|------------|---------|---------|
| 关闭 | ✗ | ✗ | 无 |
| 警告 | ✓ 标记风险 | ✓ 自动 | 标记但不阻断 |
| 严格 | ✓ 客户端+服务端 | ✓ 自动 | 高风险请求直接拦截 |

- **注入检测**：13 条加权正则规则（忽略指令、角色劫持、DAN 越狱、编码逃逸、令牌注入等），输出风险等级与原因
- **输出脱敏**：自动遮蔽响应中泄露的 OpenAI/Anthropic/Google/AWS/GitHub 密钥、Bearer 令牌、私钥、SSN、信用卡号、JWT、连接字符串

### 4. 多引擎统一流式代理
单一 `/api/chat` 端点将 OpenAI 兼容 / Anthropic / Google Gemini 三大引擎的 SSE 流归一为统一事件协议（`delta` / `usage` / `redaction` / `error` / `done`），支持视觉多模态（图片附件）。

---

## 功能清单

### 对话
- 多会话管理：置顶、重命名、搜索、删除
- 流式输出（SSE）+ 中断控制
- Markdown 渲染（GFM 表格、代码高亮、代码块复制）
- 图片附件（视觉模型）+ 文本文件内联
- 消息编辑后重生成、单条删除、整条复制
- 系统提示词（每会话独立）
- 内联风险标记 + 脱敏计数徽章
- 用量芯片（输入/输出 Token + 成本 + 耗时）

### 供应商管理
- 10 个预置：OpenAI、Anthropic、Google、DeepSeek、OpenRouter、Groq、Mistral、Moonshot、Zhipu、Ollama
- 自定义 OpenAI 兼容端点
- 每供应商：引擎类型、BaseURL、API 密钥（加密）、模型列表管理
- 密钥显示/隐藏切换

### Spectrum 多模型对比
- 最多 4 个并排槽位
- 实时流式并行渲染
- 每列独立状态、成本、时长、复制、延续到对话

### 提示词库
- 预置 4 个提示词模板（深度研究、代码审查、结构化写作、苏格拉底提问）
- 版本管理（保存历史版本、一键回滚）
- 分类筛选 + 搜索
- 收藏标记
- 一键应用为系统提示词

### 用量洞察
- KPI 卡片：总成本、请求数、输入/输出 Token
- 14 天每日成本柱状图
- 按模型 / 按供应商分布
- 每日 Token 趋势
- 纯 CSS 图表，无图表库依赖

### 设置
- **供应商**：添加/编辑/删除供应商与密钥
- **安全护盾**：三档模式切换、脱敏开关、主密码修改、保险库重置
- **外观**：深色/浅色主题、Enter 发送、流式输出、温度滑块、最大 Token
- **数据**：本地数据统计、JSON 导出、清除对话/用量

### PWA 与离线
- Web App Manifest（可安装到桌面/主屏幕）
- Service Worker：导航 network-first、静态资源 stale-while-revalidate、API 不缓存

### 安全 HTTP 头
- `X-Frame-Options: DENY`（防点击劫持）
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`（HSTS preload）
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript（严格模式） |
| 样式 | Tailwind CSS v4（CSS 变量主题） |
| 字体 | Geist Sans / Geist Mono / Sora（next/font） |
| 状态 | Zustand（5 个 store） |
| 持久化 | IndexedDB（idb-keyval）对话/提示词/用量 · localStorage 设置/保险库 |
| 加密 | Web Crypto API（PBKDF2 + AES-GCM 256） |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| 图标 | lucide-react |
| 部署 | Vercel（零配置） |

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:3000）
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run start
```

> **注意**：Web Crypto API（`crypto.subtle`）需要**安全上下文**（HTTPS 或 `localhost`）。
> 本地开发时请通过 `http://localhost:3000` 访问；若浏览器不将当前来源视为安全上下文，保险库页面会显示提示。

### 跨域开发访问
若通过代理/预览域名访问开发服务器，Next.js 16 默认会阻止跨域 HMR 请求。在 `next.config.ts` 的 `allowedDevOrigins` 中添加对应主机名即可（仅影响开发环境，生产部署无需配置）。

---

## 部署到 Vercel

### 方式一：一键部署
1. 将代码推送到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入仓库
3. 框架预设自动识别为 Next.js，无需额外配置
4. 点击 Deploy

### 方式二：Vercel CLI
```bash
npm i -g vercel
vercel        # 预览部署
vercel --prod # 生产部署
```

### 环境变量
Aegis **不需要任何环境变量**。所有 API 密钥由用户在浏览器端自行填写并加密存储，服务端无状态。

Vercel 自动提供 HTTPS，满足 Web Crypto API 的安全上下文要求。

---

## 安全架构

```
┌─────────────────────────────────────────────────────┐
│  浏览器（客户端）                                      │
│                                                       │
│  主密码 ──→ PBKDF2(250k) ──→ AES-GCM Key（仅内存）    │
│                                  │                    │
│  localStorage                    │                    │
│  ┌──────────────┐                │                    │
│  │ Sealed Vault │ ← AES-GCM 加密 │                    │
│  │ (salt+iv+cipher)│              │                    │
│  └──────────────┘                │                    │
│         │ 解密（仅内存）           │                    │
│         ▼                        │                    │
│  API Keys（明文，仅运行时）────────┼──→ 每请求经 HTTPS  │
│                                  │    临时转发，用后即弃 │
│  安全护盾（客户端层）              │                    │
│  · 提示注入检测                    │                    │
│  · 输出脱敏                        │                    │
└──────────────────────────────────┼────────────────────┘
                                   │
┌──────────────────────────────────▼────────────────────┐
│  Vercel Serverless（/api/chat）                        │
│                                                        │
│  · 无状态：不写盘、不日志密钥                           │
│  · 安全护盾（服务端层）：严格模式拦截 + 流内脱敏         │
│  · 多引擎归一：OpenAI / Anthropic / Gemini → 统一 SSE  │
│  · 安全 HTTP 头                                        │
└────────────────────────────────────────────────────────┘
```

**安全承诺**：
1. 密钥永不离开浏览器加密态（除单次请求转发）
2. 服务端无数据库、无持久化、无日志
3. 对话与用量仅存于本设备 IndexedDB
4. 锁定后内存明文即清除
5. 忘记主密码 = 数据不可恢复（这是零知识的代价，也是保障）

---

## 与竞品对比

| 特性 | Aegis | CherryStudio | LobeChat | Chatbox |
|------|-------|-------------|----------|---------|
| 密钥加密存储 | AES-256-GCM 零知识 | 明文/本地 | 明文/本地 | 明文/本地 |
| 主密码保险库 | ✓ PBKDF2+AES-GCM | ✗ | ✗ | ✗ |
| 提示注入检测 | ✓ 客户端+服务端 | ✗ | ✗ | ✗ |
| 输出脱敏 | ✓ 自动 | ✗ | ✗ | ✗ |
| 多模型并排对比 | ✓ Spectrum | ✗ | ✗ | ✗ |
| 多引擎原生支持 | ✓ OpenAI/Anthropic/Gemini | OpenAI 兼容 | OpenAI 兼容 | OpenAI 兼容 |
| 视觉多模态 | ✓ | ✓ | ✓ | 部分 |
| 用量成本分析 | ✓ 内置 | 插件 | ✗ | ✗ |
| 提示词版本管理 | ✓ | ✗ | ✗ | ✗ |
| PWA 离线 | ✓ | ✗ | ✓ | ✗ |
| Vercel 一键部署 | ✓ | ✗ 桌面应用 | ✓ | ✗ 桌面应用 |
| 自托管/无后端 | ✓ 纯前端+无状态API | ✗ | 需服务端 | ✗ |

---

## 项目结构

```
aegis/
├── app/
│   ├── api/chat/route.ts    # 多引擎统一流式代理
│   ├── page.tsx              # 对话页
│   ├── spectrum/page.tsx     # Spectrum 多模型对比
│   ├── library/page.tsx      # 提示词库
│   ├── insights/page.tsx     # 用量洞察
│   ├── settings/page.tsx     # 设置
│   ├── layout.tsx            # 根布局 + 字体 + 主题
│   └── globals.css           # 设计系统
├── components/
│   ├── AppRoot.tsx           # 应用根 + 外壳 + 侧边栏容器
│   ├── VaultGate.tsx         # 保险库创建/解锁
│   ├── ChatView.tsx          # 聊天主界面
│   ├── SpectrumView.tsx      # Spectrum 对比
│   ├── LibraryView.tsx       # 提示词库
│   ├── InsightsView.tsx      # 用量分析
│   ├── SettingsView.tsx      # 设置（4 标签页）
│   ├── Sidebar.tsx           # 会话列表 + 导航
│   ├── Composer.tsx          # 消息输入器
│   ├── MessageItem.tsx       # 消息气泡
│   ├── ModelPicker.tsx       # 模型选择器
│   ├── Markdown.tsx          # Markdown 渲染
│   ├── Logo.tsx              # 盾牌 Logo
│   └── ui.tsx                # 基础组件库
├── lib/
│   ├── crypto.ts             # 零知识加密保险库
│   ├── safety.ts             # 注入检测 + 输出脱敏
│   ├── providers.ts          # 10 个供应商预置
│   ├── pricing.ts            # Token 成本估算
│   ├── chat-client.ts        # 客户端流式解析
│   ├── db.ts                 # IndexedDB 封装
│   ├── types.ts              # 类型定义
│   ├── utils.ts              # 工具函数
│   └── store/                # 5 个 Zustand store
│       ├── vault.ts          # 保险库（加密密钥+供应商）
│       ├── settings.ts       # 设置
│       ├── chat.ts           # 对话（流式+安全）
│       ├── prompts.ts        # 提示词（版本管理）
│       └── usage.ts          # 用量记录
├── public/
│   ├── manifest.webmanifest  # PWA 清单
│   ├── sw.js                 # Service Worker
│   └── icon.svg              # 应用图标
└── next.config.ts            # 安全头 + 开发跨域配置
```

---

## License

MIT
