<![CDATA[<div align="center">

# ✉️ NovaMail

### AI-First Universal Email Client

A production-grade Progressive Web App built entirely with **Claude Code CLI**, featuring multi-agent orchestration, specs-driven development, and AI-powered email intelligence.

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://novamail.vercel.app)
[![Built with Claude](https://img.shields.io/badge/Built_with-Claude_Code-D97706?style=for-the-badge&logo=anthropic&logoColor=white)](https://claude.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<br />

<img src="docs/assets/novamail-hero.png" alt="NovaMail Screenshot" width="720" />

</div>

---

## 🎯 What is NovaMail?

NovaMail is an **AI-first universal email client** designed as a mobile-ready PWA. It provides a unified inbox experience across Gmail, Microsoft 365, and generic IMAP providers (Yahoo, AOL, etc.) — enhanced with AI-powered summaries, reply drafts, and smart prioritization.

> **Email only. No contacts. No tasks. No notes. No calendar.** Just email, done exceptionally well.

---

## ✨ Features

### 📬 Core Email
| Feature | Description |
|---------|-------------|
| **Unified Inbox** | Single view across all connected accounts |
| **Multi-Provider** | Gmail, Microsoft 365, Yahoo, AOL, any IMAP server |
| **Account Switching** | Instant context switch between email accounts |
| **Compose / Reply / Forward** | Full compose flow with CC support and context preservation |
| **Search** | Real-time search across subject, sender, and recipient fields |
| **Labels & Folders** | Full IMAP folder management with system folder detection |
| **Archive & Delete** | One-click archive to All Mail or delete to Trash |
| **Star / Read / Unread** | IMAP flag management with optimistic UI updates |

### 🤖 AI Intelligence
| Feature | Description |
|---------|-------------|
| **AI Summaries** | 2–3 sentence summaries with extracted key points |
| **Reply Drafts** | AI-generated replies in Professional, Friendly, or Brief tones |
| **Priority Classification** | High / Medium / Low with reasoning explanations |
| **Heuristic Fallbacks** | Fully functional without an API key via local algorithms |

### 📱 PWA & Mobile
| Feature | Description |
|---------|-------------|
| **Installable** | Add to home screen on iOS, Android, and desktop |
| **Offline Shell** | Service worker with Workbox precaching strategy |
| **Responsive Design** | Adaptive layout from 375px mobile to ultrawide desktop |
| **Mobile Drawer** | Touch-optimized navigation with swipe gestures |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      React SPA (Vite + PWA)                     │
│              shadcn/ui · Tailwind CSS · Zustand                 │
├─────────────────────────────────────────────────────────────────┤
│                     tRPC v11 (Type-Safe API)                    │
│                       Hono HTTP Server                          │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│  Auth    │  Account │  Email   │    AI    │   SMTP Engine       │
│  Router  │  Router  │  Router  │  Engine  │   (nodemailer)      │
├──────────┴──────────┴──────────┴──────────┴─────────────────────┤
│              IMAP Engine (imapflow + mailparser)                 │
├─────────────────────────────────────────────────────────────────┤
│              SQLite (Drizzle ORM · WAL Mode)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │   Gemini AI API    │
                    │   (with fallback   │
                    │    heuristics)     │
                    └────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, TypeScript, Vite 7 | SPA framework & build tooling |
| **Styling** | Tailwind CSS 3.4, shadcn/ui, Radix UI | Component library & design system |
| **State** | Zustand, TanStack React Query | Client & server state management |
| **Routing** | React Router 7 | Client-side navigation |
| **Backend** | Hono, tRPC 11 | HTTP server & end-to-end type-safe API |
| **Database** | SQLite, Drizzle ORM | Persistence with WAL mode concurrency |
| **Email** | imapflow, nodemailer, mailparser | IMAP/SMTP protocol handling |
| **AI** | Gemini API (configurable) | LLM-powered email intelligence |
| **PWA** | vite-plugin-pwa, Workbox | Offline support & installability |
| **Testing** | Vitest, Playwright | Unit tests & E2E smoke tests |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- An email account with IMAP/SMTP access (App Password recommended for Gmail)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/novamail.git
cd novamail

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your SESSION_SECRET and optional Gemini API key

# Initialize database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your email credentials.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite database path (default: `file:./data/novamail.db`) |
| `SESSION_SECRET` | Yes | JWT session signing secret (`openssl rand -hex 32`) |
| `GEMINI_API_KEY` | No | Gemini API key for AI features ([Get one here](https://aistudio.google.com/apikey)) |
| `GEMINI_MODEL` | No | AI model to use (default: `gemini-3.1-flash-lite`) |

> **Note:** AI features work without an API key via built-in heuristic fallbacks — keyword-based priority, sentence extraction for summaries, and template-based reply drafts.

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E smoke tests
npm run test:e2e

# Type checking
npm run check

# Lint
npm run lint
```

### Test Coverage

| Component | Unit Tests | E2E Tests | Status |
|-----------|-----------|-----------|--------|
| AI Engine (heuristics) | ✅ | — | Passing |
| UI Components | — | ✅ | Passing |
| IMAP/SMTP Engines | — | — | Manual tested |
| Auth Flow | — | — | Manual tested |
| tRPC Routers | — | — | Manual tested |

---

## 🤖 Claude Code Methodology

This project was built entirely using **Claude Code CLI** with a structured multi-agent workflow following the **Agent OS** methodology.

### CLAUDE.md

The [`CLAUDE.md`](./CLAUDE.md) file serves as the project's AI memory — defining architecture rationale, coding standards, agent orchestration workflow, implementation phases, and debugging methodology. It acts as a persistent context document that Claude Code references across sessions.

### Multi-Agent Architecture

Seven specialized agents were orchestrated to handle different domains:

| Agent | Role | Key Deliverables |
|-------|------|-----------------|
| **planner-agent** | Architecture & planning | Product spec, tech spec, task breakdown |
| **frontend-agent** | UI implementation | Components, pages, hooks, stores |
| **backend-agent** | API & data layer | tRPC routers, DB schema, email engines |
| **auth-agent** | Authentication | Auth flow, session management, account CRUD |
| **ai-agent** | AI features | Prompt engineering, Gemini integration, fallbacks |
| **testing-agent** | Quality assurance | Vitest units, Playwright E2E, coverage |
| **deployment-agent** | Build & deploy | PWA config, Vercel setup, optimization |

### Skills / Hooks / Plugins

| Skill | Description |
|-------|-------------|
| `nextjs-fullstack` | React + Vite + tRPC + Drizzle full-stack pattern |
| `ai-email-assistant` | Gemini API + prompt engineering + heuristic fallbacks |
| `imap-integration` | imapflow + nodemailer + mailparser email protocol handling |
| `pwa-optimization` | Service worker generation, manifest, offline caching |
| `responsive-ui` | Mobile-first Tailwind + shadcn/ui + drawer navigation |
| `auth-management` | JWT session + IMAP credential verification |

### Specs-Driven Development

All development was driven by upfront specifications:

- [`specs/product-spec.md`](./specs/product-spec.md) — Feature matrix, user flows, design principles
- [`specs/technical-spec.md`](./specs/technical-spec.md) — API design, data types, performance targets

### Workflow Summary

```
1. Planning Phase     → planner-agent produces specs & architecture
2. Foundation Phase   → backend-agent scaffolds DB + API; auth-agent wires auth
3. Core Build Phase   → frontend-agent builds UI; backend-agent implements email engines
4. AI Phase           → ai-agent integrates Gemini API with heuristic fallbacks
5. Polish Phase       → frontend-agent refines responsive layout & micro-interactions
6. Testing Phase      → testing-agent writes unit + E2E tests
7. Deployment Phase   → deployment-agent configures PWA + Vercel
```

Each agent operated within bounded responsibilities, communicating through:
- **Shared type contracts** (`contracts/`, `@db/schema`)
- **tRPC router** as the API contract boundary
- **Database schema** as the data contract
- **Environment variables** for configuration

---

## 📁 Project Structure

```
novamail/
├── api/                        # Backend (Hono + tRPC)
│   ├── boot.ts                 # Server entry point
│   ├── router.ts               # tRPC router registry
│   ├── auth-router.ts          # Authentication routes
│   ├── middleware.ts            # tRPC procedures & middleware
│   ├── context.ts              # Request context factory
│   ├── lib/
│   │   ├── ai-engine.ts        # Gemini AI integration + fallbacks
│   │   ├── imap-engine.ts      # IMAP protocol operations
│   │   ├── smtp-engine.ts      # SMTP send operations
│   │   ├── auth.ts             # JWT session utilities
│   │   └── env.ts              # Environment configuration
│   ├── routers/
│   │   ├── account-router.ts   # Email account CRUD
│   │   └── email-router.ts     # Email operations + AI endpoints
│   └── queries/
│       └── connection.ts       # Drizzle DB connection
├── db/
│   ├── schema.ts               # Database schema (6 tables)
│   └── relations.ts            # Table relationships
├── src/
│   ├── components/
│   │   ├── AppSidebar.tsx      # Desktop navigation sidebar
│   │   ├── InboxView.tsx       # Email list with search
│   │   ├── EmailDetail.tsx     # Email reader + AI features
│   │   ├── ComposeModal.tsx    # Compose / Reply / Forward
│   │   ├── AccountSwitcher.tsx # Multi-account selector
│   │   ├── MobileDrawer.tsx    # Mobile navigation
│   │   ├── AuthLayout.tsx      # Auth-guarded layout wrapper
│   │   └── ui/                 # shadcn/ui components
│   ├── pages/
│   │   ├── Home.tsx            # Main inbox page
│   │   ├── Login.tsx           # Authentication page
│   │   └── NotFound.tsx        # 404 page
│   ├── hooks/                  # Custom React hooks
│   └── providers/              # Context providers
├── contracts/                  # Shared type definitions
├── specs/                      # Product & technical specifications
├── docs/                       # Architecture & workflow documentation
├── tests/                      # Unit & E2E tests
├── public/                     # PWA icons & static assets
├── CLAUDE.md                   # Claude Code project memory
├── vercel.json                 # Vercel deployment configuration
└── package.json
```

---

## 🌐 Deployment

### Vercel (Recommended)

NovaMail is configured for seamless Vercel deployment:

```bash
# Build for production
npm run build

# The vercel.json handles routing and serverless function config
```

**Required Vercel Environment Variables:**
- `DATABASE_URL` — `file:./data/novamail.db`
- `SESSION_SECRET` — Strong random secret
- `GEMINI_API_KEY` — *(optional)* Gemini API key

### Manual Deployment

```bash
# Build frontend + backend
npm run build

# Start production server
npm run start
```

---

## 📄 Documentation

| Document | Description |
|----------|-------------|
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code project memory & agent config |
| [`docs/architecture.md`](./docs/architecture.md) | System architecture & data flow |
| [`docs/agents.md`](./docs/agents.md) | Multi-agent simulation details |
| [`docs/workflow.md`](./docs/workflow.md) | Development workflow & project structure |
| [`docs/testing.md`](./docs/testing.md) | Test strategy & coverage report |
| [`specs/product-spec.md`](./specs/product-spec.md) | Product specification & feature matrix |
| [`specs/technical-spec.md`](./specs/technical-spec.md) | Technical specification & API design |

---

## 🔒 Security

- **IMAP/SMTP over TLS** — All email connections use encrypted transport
- **JWT Sessions** — Stateless, signed session tokens
- **No Email Storage** — Email content fetched on-demand via IMAP, never persisted
- **Credential Isolation** — Passwords never exposed in API responses
- **App Password Support** — Works with Gmail/Outlook App Passwords for 2FA users

---

## 📜 License

This project is built as a demonstration of Claude Code CLI capabilities for AI-first application development.

---

<div align="center">

**Built with 🧠 [Claude Code](https://claude.ai) · Deployed on ▲ [Vercel](https://vercel.com)**

</div>
]]>
