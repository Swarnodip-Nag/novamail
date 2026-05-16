<![CDATA[# NovaMail — Agents, Skills, Hooks & Plugins Registry

> Multi-agent orchestration via Claude Code (Claude Opus 4.7) · Agent OS Methodology

---

## Agent Registry

NovaMail was built using a **multi-agent workflow** orchestrated through Claude Code CLI. A single Claude Opus 4.7 instance assumed specialized agent roles based on the current development phase, maintaining bounded responsibilities and well-defined handoff points.

### 1. `planner-agent`

| Property | Detail |
|----------|--------|
| **Domain** | Architecture, specifications, task decomposition |
| **Entry** | Project kickoff, major feature requests |
| **Exit** | Specs approved, architecture frozen, implementation plan accepted |

**Workflow:**
1. Analyze assignment requirements (AI-first email client, PWA, multi-provider)
2. Evaluate technology options against constraints (mobile-ready, serverless-deployable)
3. Select stack: React 19 + Vite + tRPC + Hono + SQLite + Drizzle
4. Author `specs/product-spec.md` (feature matrix, user flows, design principles)
5. Author `specs/technical-spec.md` (API design, data types, performance targets)
6. Define implementation phases and agent handoff points

**Checkpoints:**
- [x] Stack selection rationale documented
- [x] Product spec covers all assignment requirements
- [x] Technical spec defines all tRPC endpoints
- [x] Phase plan accepted

---

### 2. `frontend-agent`

| Property | Detail |
|----------|--------|
| **Domain** | React components, responsive layout, UI/UX polish |
| **Entry** | Layout tasks, component creation, visual refinement |
| **Exit** | Components rendering correctly, mobile responsive, loading/error states complete |

**Workflow:**
1. Configure shadcn/ui with Tailwind CSS design tokens
2. Build layout shell: `AuthLayout` → three-panel desktop / drawer mobile
3. Implement core components: `InboxView`, `EmailDetail`, `ComposeModal`
4. Build navigation: `AppSidebar` (desktop), `MobileDrawer` (responsive)
5. Add `AccountSwitcher` with multi-account dropdown
6. Polish: skeleton loaders, empty states, error states with retry, toast notifications

**Deliverables:**
- `src/components/AppSidebar.tsx` — Desktop sidebar with folder list
- `src/components/InboxView.tsx` — Email list with search bar, pagination
- `src/components/EmailDetail.tsx` — Email reader with AI summary/reply/priority panels
- `src/components/ComposeModal.tsx` — New/reply/forward compose dialog
- `src/components/AccountSwitcher.tsx` — Multi-account selector dropdown
- `src/components/MobileDrawer.tsx` — Touch-optimized mobile navigation
- `src/components/AuthLayout.tsx` — Auth-guarded layout wrapper
- `src/components/AuthLayoutSkeleton.tsx` — Loading state for auth check
- `src/pages/Home.tsx` — Main inbox page
- `src/pages/Login.tsx` — Glassmorphism login page with provider auto-detect
- `src/pages/NotFound.tsx` — 404 page

**Checkpoints:**
- [x] Three-panel layout rendering on desktop
- [x] Mobile drawer navigation functional at <768px
- [x] Email list with skeleton loading states
- [x] Email detail with HTML content rendering
- [x] Compose modal with reply/forward context preservation

---

### 3. `backend-agent`

| Property | Detail |
|----------|--------|
| **Domain** | Database schema, tRPC routers, IMAP/SMTP engines |
| **Entry** | API tasks, data layer changes, protocol implementation |
| **Exit** | Type-safe endpoints working, email operations verified |

**Workflow:**
1. Design database schema: 6 tables (users, email_accounts, folders, emails, attachments, settings)
2. Configure Drizzle ORM with SQLite WAL mode
3. Implement `account-router.ts` — CRUD, folder listing, folder status
4. Implement `email-router.ts` — inbox, get, search, send, reply, forward, flags, AI endpoints
5. Build `imap-engine.ts` — Connection pooling, UID operations, folder management, flag manipulation
6. Build `smtp-engine.ts` — Provider-aware transporter, TLS configuration, HTML+text support

**Deliverables:**
- `db/schema.ts` — 6-table schema with full TypeScript types
- `api/routers/account-router.ts` — 8 tRPC procedures (list, get, create, update, delete, setDefault, listFolders, folderStatus)
- `api/routers/email-router.ts` — 14 tRPC procedures (inbox, get, search, send, reply, forward, markRead, markUnread, toggleStar, archive, delete, aiSummary, aiReply, aiPriority)
- `api/lib/imap-engine.ts` — IMAP engine with connection pool, search, fetch, flag management
- `api/lib/smtp-engine.ts` — SMTP engine with provider-aware configuration

**Checkpoints:**
- [x] Schema pushed to SQLite (6 tables, 0 errors)
- [x] Account CRUD working end-to-end
- [x] IMAP fetch returning parsed emails
- [x] SMTP send delivering to Gmail/Outlook
- [x] All tRPC procedures type-safe with Zod validation

---

### 4. `auth-agent`

| Property | Detail |
|----------|--------|
| **Domain** | Authentication flow, JWT sessions, credential security |
| **Entry** | Auth-related tasks, login/logout flow |
| **Exit** | Login → session → account-switching → logout working |

**Workflow:**
1. Design JWT session management with `jose` library
2. Implement IMAP-based credential verification (connect to IMAP server to validate credentials)
3. Build `auth-router.ts` with login, logout, session check endpoints
4. Configure session middleware for tRPC context
5. Auto-detect provider settings from email domain (Gmail, Outlook, Yahoo, AOL)

**Deliverables:**
- `api/auth-router.ts` — Login (IMAP verify), logout, session endpoints
- `api/lib/auth.ts` — JWT sign/verify utilities
- `api/lib/cookies.ts` — HttpOnly cookie management
- `api/middleware.ts` — Session verification middleware for tRPC procedures

**Checkpoints:**
- [x] Login with Gmail App Password verified via IMAP
- [x] JWT session persists across page refreshes
- [x] Logout clears session cookie
- [x] Provider auto-detection working for Gmail, Outlook, Yahoo, AOL

---

### 5. `ai-agent`

| Property | Detail |
|----------|--------|
| **Domain** | AI features, prompt engineering, heuristic fallbacks |
| **Entry** | AI feature tasks, prompt optimization |
| **Exit** | AI + heuristic both working, response time <15s, source attribution in UI |

**Workflow:**
1. Configure Gemini API client with retry logic (1 retry, 25s timeout)
2. Design prompt templates with strict output format (SUMMARY/KEY_POINTS, PRIORITY/REASON)
3. Implement email summarization (2–3 sentences + up to 3 key points)
4. Implement reply draft generation (3 tone options: Professional, Friendly, Brief)
5. Implement priority classification (High/Medium/Low with reasoning)
6. Build heuristic fallbacks for every AI feature
7. Add source attribution (AI vs. heuristic) displayed in UI

**Deliverables:**
- `api/lib/ai-engine.ts` — Complete AI module (421 lines):
  - `summarizeEmail()` — Gemini summarization with sentence-extraction fallback
  - `generateReplyDraft()` — Gemini drafting with template-based fallback
  - `classifyPriority()` — Gemini classification with keyword-matching fallback
  - `generateHeuristicSummary()` — First-sentence extraction algorithm
  - `extractKeyPointsHeuristic()` — Bullet/sentence extraction algorithm
  - `classifyPriorityHeuristic()` — Keyword-based priority (urgent/deadline → high)

**Checkpoints:**
- [x] Gemini API integration working with valid API key
- [x] All three AI features returning structured responses
- [x] Heuristic fallbacks working without API key
- [x] Source attribution ("AI" / "heuristic") displayed in EmailDetail UI
- [x] Input sanitization: HTML stripped, URLs removed, truncated to 3000 chars

---

### 6. `testing-agent`

| Property | Detail |
|----------|--------|
| **Domain** | Unit tests, E2E tests, type checking, code quality |
| **Entry** | Post-feature stabilization, pre-deploy validation |
| **Exit** | Tests green, type check passing, coverage targets met |

**Workflow:**
1. Write Vitest unit tests for AI heuristic algorithms
2. Write Playwright E2E smoke tests for critical flows
3. Verify TypeScript compilation with `tsc -b` (zero errors)
4. Validate ESLint rules passing

**Deliverables:**
- `tests/ai-engine.test.ts` — Unit tests for `classifyPriorityHeuristic`, `generateHeuristicSummary`, `extractKeyPointsHeuristic`
- `tests/smoke.spec.ts` — E2E tests for page loads, login page accessibility, PWA manifest validation

**Checkpoints:**
- [x] `npm run test` — All unit tests passing
- [x] `npm run test:e2e` — All smoke tests green
- [x] `npm run check` — TypeScript zero errors
- [x] `npm run lint` — ESLint clean

---

### 7. `deployment-agent`

| Property | Detail |
|----------|--------|
| **Domain** | Build pipeline, PWA configuration, Vercel deployment |
| **Entry** | Pre-deploy tasks, build optimization |
| **Exit** | Production build passing, PWA installable, Vercel deployed |

**Workflow:**
1. Configure Vite production build (SPA output to `dist/public/`)
2. Configure esbuild for API bundle (`dist/boot.js`)
3. Set up vite-plugin-pwa with Workbox (precaching, 5MB budget)
4. Generate app icons (192x192, 512x512)
5. Author `vercel.json` (serverless function routing, static CDN, SPA fallback)
6. Configure security headers (X-Content-Type-Options, X-Frame-Options, XSS-Protection)

**Deliverables:**
- `vite.config.ts` — Vite + React + PWA + Hono dev server configuration
- `vercel.json` — Vercel deployment with routes, functions, headers
- `public/icon-192x192.png` — PWA icon (192×192)
- `public/icon-512x512.png` — PWA icon (512×512)
- `public/favicon.svg` — Browser favicon

**Checkpoints:**
- [x] `npm run build` completes without errors
- [x] PWA manifest valid and installable
- [x] Service worker registering and precaching assets
- [x] Vercel deployment configuration tested

---

## Skills Registry

Skills are reusable capability modules that agents invoke during implementation.

| Skill ID | Description | Used By |
|----------|-------------|---------|
| `fullstack-typescript` | React 19 + Vite + tRPC + Hono + Drizzle full-stack pattern | backend-agent, frontend-agent |
| `ai-email-intelligence` | Gemini API integration + prompt engineering + heuristic fallback pattern | ai-agent |
| `imap-smtp-protocol` | imapflow connection pooling + nodemailer transport + mailparser MIME handling | backend-agent |
| `pwa-workbox` | vite-plugin-pwa + Workbox precaching + web manifest + offline shell | deployment-agent |
| `responsive-mobile-first` | Tailwind breakpoints + shadcn/ui + mobile drawer + touch interactions | frontend-agent |
| `jwt-auth-flow` | JWT session management + IMAP credential verification + cookie handling | auth-agent |
| `specs-driven-dev` | Product spec → technical spec → implementation → testing pipeline | planner-agent |
| `test-pyramid` | Vitest units → Playwright E2E → type check → lint enforcement | testing-agent |

---

## Hooks

Hooks are lifecycle events that trigger cross-agent coordination.

| Hook | Trigger | Action |
|------|---------|--------|
| `pre-commit` | Before any code commit | Run `npm run check` + `npm run lint` |
| `post-schema-change` | After `db/schema.ts` is modified | Run `npm run db:push` to sync database |
| `post-router-add` | After new tRPC router created | Register in `api/router.ts`, verify types |
| `post-component-add` | After new React component created | Verify responsive at 375px + 1280px |
| `pre-deploy` | Before Vercel deployment | Run full test suite (`test` + `check` + `lint`) |
| `post-ai-change` | After AI prompt or engine modification | Verify both AI path and heuristic fallback |

---

## Plugins

Plugins are third-party integrations managed as project dependencies.

| Plugin | Version | Purpose | Agent |
|--------|---------|---------|-------|
| `vite-plugin-pwa` | 1.3.0 | Service worker generation + web manifest | deployment-agent |
| `@hono/vite-dev-server` | 0.25.3 | Hono API dev server within Vite | backend-agent |
| `tailwindcss-animate` | 1.0.7 | CSS animation utilities for micro-interactions | frontend-agent |
| `@tanstack/react-query` | 5.90.16 | Server state management with caching | frontend-agent |
| `@trpc/react-query` | 11.8.1 | tRPC + React Query integration | frontend-agent |
| `drizzle-kit` | 0.31.8 | Schema migrations and database management | backend-agent |
| `jose` | 6.1.3 | JWT token signing and verification | auth-agent |
| `imapflow` | 1.0.181 | IMAP protocol client with connection pooling | backend-agent |
| `nodemailer` | 6.9.16 | SMTP email transport | backend-agent |
| `mailparser` | 3.7.2 | MIME email parsing | backend-agent |
]]>
