![AegisChat Icon](https://raw.githubusercontent.com/shwhenever/AegisChat/refs/heads/main/icon.png)

# Aegis — Security-First AI Client
# All-in-One AI Workstation

[<img src="https://vercel.com/button" height="30">](https://vercel.com/new/clone?repository-url=https://github.com/shwhenever/AegisChat&project-name=AegisChat&repository-name=AegisChat) [<img src="https://gitpod.io/button/open-in-gitpod.svg" alt="Open in Gitpod" height="30">](https://gitpod.io/github.com/shwhenever/AegisChat)



[中文版本](https://github.com/shwhenever/AegisChat/blob/main/README_CN.md)


> Zero-Knowledge Encrypted Key Vault · Multi-Model Routing · Spectrum Multi-Model Comparison · Safety Shield · Deployable on Vercel

Aegis is a self-hosted AI client, comparable to CherryStudio / LobeChat / Chatbox, with **security** as its first principle. All API keys are encrypted locally using AES-256-GCM keys derived from a master password, only decrypted in memory when sending requests, and discarded immediately after HTTPS forwarding. The server consists of stateless Serverless functions that **never persist or log** any keys.

---

## Core Innovations

### 1. Zero-Knowledge Encrypted Key Vault
- Master Password → PBKDF2(SHA-256, 250,000 iterations) → AES-GCM 256-bit Key
- Keys stored as sealed (Sealed Blob) in `localStorage`, decrypted state exists only in runtime memory
- Cleartext keys and master password references are wiped from memory immediately after session lock
- Built-in password strength meter (entropy estimation + crack time hints)

### 2. Spectrum Multi-Model Comparison Mode
Send the same prompt **in parallel** to 2–4 models, comparing response quality, token usage, cost, and latency side-by-side. One-click to continue any result into an independent conversation. This is a core differentiating capability not offered by CherryStudio, LobeChat, or Chatbox.

### 3. Safety Shield
ию
Client-side + server-side dual-layer protection, running entirely locally without relying on external services:

| Mode | Prompt Injection Detection | Output Redaction | Blocking Behavior |
|------|---------------------------|------------------|-------------------|
| Off | ✗ | ✗ | None |
| Warning | ✓ Risk flagged | ✓ Automatic | Flagged but not blocked |
| Strict | ✓ Client + Server | ✓ Automatic | High-risk requests directly blocked |

- **Injection Detection**: 13 weighted regex rules (ignore instructions, role hijacking, DAN jailbreak, encoding escape, token injection, etc.), outputting risk level and reason
- **Output Redaction**: Automatically masks leaked OpenAI/Anthropic/Google/AWS/GitHub keys, Bearer tokens, private keys, SSNs, credit card numbers, JWTs, connection strings in responses

### 4. Multi-Engine Unified Streaming Proxy
A single `/api/chat` endpoint unifies SSE streams from OpenAI-compatible / Anthropic / Google Gemini engines into a unified event protocol (`delta` / `usage` / `redaction` / `error` / `done`), supporting visual multimodality (image attachments).

---

## Feature List

### Conversations
- Multi-session management: pin, rename, search, delete
- Streaming output (SSE) + interrupt control
- Markdown rendering (GFM tables, code highlighting, code block copy)
- Image attachments (vision models) + text file inline
- Message edit regeneration, single delete, full copy
- System prompt (per session)
- Inline risk markers + redaction count badges
- Usage chips (input/output tokens + cost + latency)

### Provider Management
- 10 presets: OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Groq, Mistral, Moonshot, Zhipu, Ollama
- Custom OpenAI-compatible endpoints
- Per provider: engine type, BaseURL, API key (encrypted), model list management
- Key show/hide toggle

### Spectrum Multi-Model Comparison
- Up to 4 side-by-side slots
- Real-time streaming parallel rendering
- Per-column independent status, cost, duration, copy, continue to conversation

### Prompt Library
- 4 preset prompt templates (deep research, code review, structured writing, Socratic questioning)
- Version management (save history versions, one-click rollback)
- Category filtering + search
- Favorite marking
- One-click apply as system prompt

### Usage Insights
- KPI cards: total cost, request count, input/output tokens
- 14-day daily cost bar chart
- By model / by provider distribution
- Daily token trends
- Pure CSS charts, no chart library dependency

### Settings
- **Providers**: add/edit/delete providers and keys
- **Safety Shield**: three-mode toggle, redaction switch, master password change, vault reset
- **Appearance**: dark/light theme, Enter to send, streaming output, temperature slider, max tokens
- **Data**: local data statistics, JSON export, clear conversations/usage

### PWA & Offline
- Web App Manifest (installable to desktop/home screen)
- Service Worker: navigation network-first, static resources stale-while-revalidate, API not cached

### Security HTTP Headers
- `X-Frame-Options: DENY` (clickjacking protection)
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS preload)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 (CSS variable themes) |
| Fonts | Geist Sans / Geist Mono / Sora (next/font) |
| State | Zustand (5 stores) |
| Persistence | IndexedDB (idb-keyval) conversations/prompts/usage · localStorage settings/vault |
| Encryption | Web Crypto API (PBKDF2 + AES-GCM 256) |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| Icons | lucide-react |
| Deployment | Vercel (zero configuration) |

---

## Local Development

```bash
# Install她被Installation dependencies
npm install 作者

# Start development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm run start
```

> **Note**: Web Crypto API (`crypto.subtle`) requires a **secure context** (HTTPS or `localhost`).
> Access via `http://localhost:3000` during local development; if the browser does not consider the current origin secure, the vault page will display a warning.

### Cross-Origin Development Access
If accessing the dev server through a proxy/preview domain, Next.js 16 will block cross-origin HMR requests by default. Add the corresponding hostname to `allowedDevOrigins` in `next.config.ts` (affects only development environment, no production configuration needed).

---

## Deploy to Vercel

### Method 1: One-Click Deploy
1. Push code to GitHub
2. Import repository on [vercel.com](https://vercel.com)
3. Framework preset auto-detects Next.js, no additional configuration needed
4. Click Deploy

### Method 2: Vercel CLI
```bash
npm i -g vercel
vercel        # Preview deployment
vercel --prod # Production deployment
```

### Environment Variables
Aegis **requires no environment variables**. All API keys are filled and encrypted by users in the browser, server is stateless.

Vercel automatically provides HTTPS, satisfying Web Crypto API secure context requirements.

---

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (Client)                                    │
│                                                       │
│  Master Password ──→ PBKDF2(250k) ──→ AES-GCM Key (memory only) │
│                                  │                    │
│  localStorage                    │                    │
│  ┌──────────────┐                │                    │
│  │ Sealed Vault │ ← AES-GCM encrypted │               │
│  │ (salt+iv+cipher)│              │                    │
│  └──────────────┘                │                    │
│         │ decrypt (memory only)  │                    │
│         ▼                        │                    │
│  API Keys (plaintext, runtime only)────┼──→ Per-request HTTPS │
│                                  │    temporary forward, discard after use │
│  Safety Shield (client layer)     │                    │
│  · Prompt injection detection     │                    │
│  · Output redaction               │                    │
└──────────────────────────────────┼────────────────────┘
                                   │
┌──────────────────────────────────▼────────────────────┐
│  Vercel Serverless (/api/chat)                         │
│                                                        │
│  · Stateless: no disk writes, no key logging           │
│  · Safety Shield (server layer): strict mode blocking + stream redaction │
│  · Multi-engine unification: OpenAI / Anthropic / Gemini → unified SSE │
│  · Security HTTP headers                               │
└────────────────────────────────────────────────────────┘
```

**Security Commitments**:
1. Keys never leave browser encrypted state (except for single request forwarding)
2. Server has no database, no persistence, no logs
3. Conversations and usage stored only in device IndexedDB
4. Memory plaintext cleared immediately after lock
5. Forgotten master password = unrecoverable data (the cost of zero-knowledge, and its guarantee)

---

## Comparison with Competitors

| Feature | Aegis | CherryStudio | LobeChat | Chatbox |
|---------|-------|-------------|----------|---------|
| Key encrypted storage | AES-256-GCM zero-knowledge | Plaintext/local | Plaintext/local | Plaintext/local |
| Master password vault | ✓ PBKDF2+AES-GCM | ✗ | ✗ | ✗ |
| Prompt injection detection | ✓ Client+Server | ✗ | ✗ | ✗ |
| Output redaction | ✓ Automatic | ✗ | ✗ | ✗ |
| Multi-model side-by-side comparison | ✓ Spectrum | ✗ | ✗ | ✗ |
| Multi-engine native support | ✓ OpenAI/Anthropic/Gemini | OpenAI-compatible | OpenAI-compatible | OpenAI-compatible |
| Visual multimodality | ✓ | ✓ | ✓ | Partial |
| Usage cost analysis | ✓ Built-in | Plugin | ✗ | ✗ |
| Prompt version management | ✓ | ✗ | ✗ | ✗ |
| PWA offline | ✓ | ✗ | ✓ | ✗ |
| Vercel one-click deploy | ✓级车| ✗ Desktop app | ✓ | ✗ Desktop app |
| Self-hosted/no backend | ✓ Pure frontend + stateless API | ✗ | Requires server | ✗ |

---

## Project Structure

```
aegis/
├── app/
│   ├── api/chat/route.ts    # Multi-engine unified streaming proxy
│   ├── page.tsx              # Chat page
│   ├── spectrum/page.tsx     # Spectrum multi-model comparison
│   ├── library/page.tsx      # Prompt library
│   ├── insights/page.tsx     # Usage insights
│   ├── settings/page.tsx     # Settings
│   ├── layout.tsx            # Root layout + fonts + theme
│   └── globals.css           # Design system
├── components/
│   ├── AppRoot.tsx           # App root + shell + sidebar container
│   ├── VaultGate.tsx         # Vault creation/unlock
│   ├── ChatView.tsx          # Chat main interface
│   ├── SpectrumView.tsx      # Spectrum comparison
│   ├── LibraryView.tsx       # Prompt library
│   ├── InsightsView.tsx      # Usage analysis
│   ├── SettingsView.tsx      # Settings (4 tabs)
│   ├── Sidebar.tsx           # Session list + navigation
│   ├── Composer.tsx          # Message input
│   ├── MessageItem.tsx       # Message bubble
│   ├── ModelPicker.tsx       # Model selector
│   ├── Markdown.tsx          # Markdown rendering
│   ├── Logo.tsx              # Shield logo
│   └── ui.tsx                # Basic component library
├── lib/
│   ├── crypto.ts             # Zero-knowledge encrypted vault
│   ├── safety.ts             # Injection detection + output redaction
│   ├── providers.ts          # 10 provider presets
│   ├── pricing.ts            # Token cost estimation
│   ├── chat-client.ts        # Client-side streaming parser
│   ├── db.ts                 # IndexedDB wrapper
│   ├── types.ts              # Type definitions
│   ├── utils.ts              # Utility functions
│   └── store/                # 5 Zustand stores
│       ├── vault.ts          # Vault (encrypted keys + providers)
│       ├── settings.ts       # Settings
│       ├── chat.ts           # Conversations (streaming + safety)
│       ├── prompts.ts        # Prompts (version management)
│       └── usage.ts          # Usage records
├── public/
│   ├── manifest.webmanifest  # PWA manifest
│   ├── sw.js                 # Service Worker
│   └── icon.svg              # App icon
└── next.config.ts            # Security headers + dev CORS config
```

---

## License

MIT
