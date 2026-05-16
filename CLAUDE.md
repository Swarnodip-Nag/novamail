# CLAUDE.md — NovaMail Project Memory

> This file is the persistent memory for Claude Code (Claude Opus 4.7). It defines the project's identity, architecture decisions, coding standards, agent orchestration, and debugging methodology. Claude reads this file at the start of every session to maintain continuity across the entire development lifecycle.

---

## Project Identity

**NovaMail** is an AI-first universal email client built as a mobile-ready Progressive Web App. It is a pure email application — no contacts, tasks, notes, or calendar. It supports Gmail, Microsoft 365, and generic IMAP providers (Yahoo, AOL, custom servers) with a unified inbox, multi-account switching, compose/reply/forward, search, labels, archive/delete, plus AI-powered summaries, reply drafts, and priority classification.

**Built entirely using Claude Code CLI** with multi-agent orchestration, specs-driven development, and the Agent OS methodology.

---

## Architecture Rationale

Every technology choice was made deliberately during the planning phase:

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend** | React 19 + TypeScript + Vite 7 | Fastest iteration speed. Vite's HMR + React 19's concurrent features enable instant feedback loops during agent-driven development. |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui + Radix UI | shadcn/ui gives copy-paste ownership of accessible primitives. No vendor lock-in. Tailwind enables rapid layout iteration without context-switching to CSS files. |
| **State** | Zustand (client) + TanStack React Query (server) | Zustand is zero-boilerplate for UI state. React Query handles server cache, deduplication, background refetch — critical for an email client that needs fresh data. |
| **Backend** | Hono + tRPC 11 | End-to-end type safety from database to UI. Hono is 3x faster than Express, runs on any runtime (Node, Bun, edge). tRPC eliminates API contract drift. |
| **Database** | SQLite + Drizzle ORM | Zero infrastructure. WAL mode enables concurrent reads during writes. Drizzle provides compile-time schema validation. Perfect for MVP velocity → production path (swap to Turso/LibSQL for scale). |
| **Email** | imapflow + nodemailer + mailparser | Industry-standard Node.js email stack. imapflow handles connection pooling, IDLE, and UID-based operations. nodemailer is battle-tested for SMTP. |
| **AI** | Gemini API + local heuristic fallbacks | Gemini provides high-quality LLM features (summarization, reply drafting, priority classification). Heuristic fallbacks ensure the app is fully functional without an API key — AI-first but never AI-dependent. |
| **PWA** | vite-plugin-pwa + Workbox | Auto-generates service worker and web manifest. Workbox handles precaching strategy with 5MB budget. App is installable on mobile and desktop. |
| **Testing** | Vitest + Playwright | Vitest for fast unit tests (AI heuristics, data transforms). Playwright for E2E smoke tests (page loads, PWA validation). |

---

## Coding Standards

These rules are enforced across every file Claude Code touches:

- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **Functional React** — No class components. Hooks only. Custom hooks for shared logic.
- **tRPC for all API calls** — No raw `fetch()` in frontend. Every endpoint is type-safe end-to-end.
- **Drizzle ORM exclusively** — No raw SQL. Schema changes go through `db/schema.ts` → `npm run db:push`.
- **Tailwind for all styling** — No inline styles, no CSS modules. shadcn/ui components use CVA variants.
- **Lucide icons only** — Consistent icon set. No mixing icon libraries.
- **Zod validation** — All tRPC inputs validated with Zod schemas. No trust-the-client patterns.
- **Error boundaries** — Every async operation has explicit error handling with user-facing fallbacks.
- **AI graceful degradation** — Every AI feature has a heuristic fallback. The app never breaks if the LLM is unavailable.

---

## Agent Orchestration (Agent OS Methodology)

Claude Code operates as an **Agent OS** — a single intelligence that assumes specialized agent roles depending on the task. Each agent has defined responsibilities, checkpoints, and deliverables. Role switching happens naturally within the CLI session based on the current implementation phase.

### Agent Registry

| Agent | Domain | Entry Condition | Exit Condition |
|-------|--------|----------------|----------------|
| `planner-agent` | Architecture, specs, task decomposition | Start of project / major feature | Specs approved, plan frozen |
| `frontend-agent` | React components, pages, responsive UI | Layout tasks, component creation | Visual parity with design, mobile verified |
| `backend-agent` | tRPC routers, DB schema, email engines | API tasks, data layer changes | Type-safe, tested, integrated with frontend |
| `auth-agent` | Login flow, JWT sessions, credential security | Auth-related tasks | Login → session → logout flow working |
| `ai-agent` | Gemini integration, prompts, fallback heuristics | AI feature tasks | AI + heuristic both working, <15s response |
| `testing-agent` | Vitest units, Playwright E2E, coverage | Post-feature stabilization | Tests green, coverage targets met |
| `deployment-agent` | Vite build, PWA manifest, Vercel config | Pre-deploy tasks | Build passing, PWA installable, deployed |

### Agent Communication Protocol

Agents share context through well-defined boundaries:
- **Type contracts** → `contracts/types.ts`, `contracts/constants.ts`, `contracts/errors.ts`
- **Schema contracts** → `db/schema.ts` (single source of truth for data shape)
- **API contracts** → tRPC router definitions (compile-time type enforcement)
- **Environment contracts** → `api/lib/env.ts` (centralized env parsing with defaults)
- **Specification contracts** → `specs/product-spec.md`, `specs/technical-spec.md`

---

## Implementation Phases

### Phase 1: Foundation ✅
- [x] Scaffold Vite + React + TypeScript project
- [x] Configure Tailwind CSS + shadcn/ui component system
- [x] Design and push SQLite schema (6 tables: users, email_accounts, folders, emails, attachments, settings)
- [x] Implement JWT auth system with IMAP credential verification
- [x] Build auth-guarded layout with glassmorphism login page

### Phase 2: Core Email ✅
- [x] IMAP engine with connection pooling (5-minute TTL, lazy creation, auto-reconnect)
- [x] SMTP engine with provider-aware transporter configuration
- [x] Email fetch with mailparser (full HTML/text rendering, header extraction)
- [x] Folder management with system folder detection (Inbox, Sent, Drafts, Trash, Archive)
- [x] Account CRUD with provider auto-detection (Gmail, Outlook, generic IMAP)

### Phase 3: UI/UX Polish ✅
- [x] Three-panel layout: Sidebar → Email List → Email Detail
- [x] InboxView with search, pagination, skeleton loading, empty states
- [x] EmailDetail with HTML sanitization, metadata display, action toolbar
- [x] ComposeModal for new email, reply, forward (with CC support)
- [x] AccountSwitcher with multi-account dropdown
- [x] MobileDrawer for responsive navigation (<768px)
- [x] Error states with retry actions and toast notifications

### Phase 4: AI Features ✅
- [x] Gemini API integration with modular provider abstraction
- [x] Email summarization (2–3 sentence summary + up to 3 key points)
- [x] Reply draft generation (3 tone options: Professional, Friendly, Brief)
- [x] Priority classification (High/Medium/Low with reasoning)
- [x] Heuristic fallbacks for all AI features (keyword priority, sentence extraction, template replies)
- [x] Source attribution (AI vs. heuristic) displayed in UI

### Phase 5: PWA & Deployment ✅
- [x] Web manifest with app icons (192x192, 512x512)
- [x] Service worker with Workbox precaching (JS, CSS, HTML, icons — 5MB budget)
- [x] Offline shell support
- [x] Vercel deployment configuration (`vercel.json`)
- [x] Production build pipeline (Vite SPA + esbuild API bundle)

### Phase 6: Testing ✅
- [x] Vitest unit tests for AI heuristic algorithms
- [x] Playwright E2E smoke tests for critical user flows
- [x] Type checking with `tsc -b` (zero errors)
- [x] ESLint code quality enforcement

---

## AI-First Design Philosophy

NovaMail is designed around the principle that **AI should enhance every interaction without ever blocking it**.

### The AI Contract
1. **Every AI feature has a heuristic fallback.** If Gemini is down, rate-limited, or unconfigured, the app still works.
2. **AI responses are attributed.** The UI shows whether a summary/reply/priority came from "AI" or "heuristic" so users know the confidence level.
3. **AI never blocks the critical path.** Email reading, composing, and sending work independently of AI status.
4. **Prompts are deterministic.** System prompts define exact output format (SUMMARY/KEY_POINTS, PRIORITY/REASON). Response parsing uses regex extraction — not fragile JSON parsing.
5. **Input sanitization before AI.** HTML tags and URLs stripped. Content truncated to 3000 chars for summaries, 2000 chars for replies/priority. Prevents token waste and prompt injection.

### Prompt Architecture
```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Email Body  │────→│  Strip HTML/URLs │────→│  Truncate     │
│  (raw)       │     │  Collapse spaces │     │  (3000 chars) │
└─────────────┘     └──────────────────┘     └───────┬───────┘
                                                      │
                              ┌────────────────────────▼────────────────────────┐
                              │  System Prompt (format instructions)            │
                              │  + User Prompt (Subject + From + Clean Body)    │
                              └────────────────────────┬────────────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────┐
                                    │         Gemini API Call             │
                                    │    temp=0.3 | maxTokens=512        │
                                    │    timeout=25s | 1 retry           │
                                    └──────────────────┬──────────────────┘
                                                       │
                                          ┌────────────▼────────────┐
                                          │   Success?              │
                                          │   ├── Yes → Parse regex │
                                          │   └── No  → Heuristic  │
                                          └─────────────────────────┘
```

---

## Testing Strategy

| Layer | Tool | Scope | Location |
|-------|------|-------|----------|
| Unit | Vitest | AI heuristics, data transforms | `tests/*.test.ts` |
| E2E | Playwright | Page loads, PWA manifest, smoke flows | `tests/*.spec.ts` |
| Type | `tsc -b` | Full project type coverage | Compiler config |
| Lint | ESLint | Code quality, React hooks rules | `eslint.config.js` |

**Coverage targets:** Core logic >80%, UI components >60%.

**Test commands:**
```bash
npm run test        # Vitest unit tests
npm run test:e2e    # Playwright E2E
npm run check       # TypeScript type checking
npm run lint        # ESLint
```

---

## Deployment Configuration

- **Platform:** Vercel (serverless)
- **Build:** `vite build` (SPA) + `esbuild` (API bundle)
- **Output:** `dist/public/` (static) + `dist/boot.js` (serverless function)
- **Database:** SQLite file (MVP) — recommend Turso/LibSQL for production scale
- **PWA:** Auto-generated service worker via `vite-plugin-pwa`
- **Environment:** `SESSION_SECRET` (required), `GEMINI_API_KEY` (optional), `DATABASE_URL`

---

## Debugging Runbook

1. **Emails not loading?** → Check IMAP credentials. Gmail requires App Passwords with 2FA. Verify `imapHost`/`imapPort` in account settings.
2. **AI features returning heuristics?** → Check `GEMINI_API_KEY` in `.env`. Verify quota at Google AI Studio.
3. **Session expired?** → Check `SESSION_SECRET` hasn't changed. JWT tokens are signed with this secret.
4. **Database errors?** → Run `npm run db:push` to sync schema. Check `data/` directory exists and is writable.
5. **PWA not installing?** → Verify `manifest.webmanifest` is served. Check HTTPS (required for service workers in production).
6. **Build failures?** → Run `npm run check` for type errors. Run `npm run lint` for code quality issues.

---

## File Ownership Map

| File/Directory | Owner Agent | Purpose |
|---------------|-------------|---------|
| `CLAUDE.md` | planner-agent | Project memory & standards |
| `specs/` | planner-agent | Product & technical specifications |
| `docs/` | planner-agent | Architecture & workflow documentation |
| `db/schema.ts` | backend-agent | Database schema (source of truth) |
| `api/routers/` | backend-agent | tRPC API endpoints |
| `api/lib/imap-engine.ts` | backend-agent | IMAP protocol operations |
| `api/lib/smtp-engine.ts` | backend-agent | SMTP send operations |
| `api/lib/ai-engine.ts` | ai-agent | AI integration + heuristic fallbacks |
| `api/auth-router.ts` | auth-agent | Authentication flow |
| `api/lib/auth.ts` | auth-agent | JWT session management |
| `src/components/` | frontend-agent | React UI components |
| `src/pages/` | frontend-agent | Route-level pages |
| `tests/` | testing-agent | Unit & E2E tests |
| `vite.config.ts` | deployment-agent | Build & PWA configuration |
| `vercel.json` | deployment-agent | Vercel deployment routing |
]]>
