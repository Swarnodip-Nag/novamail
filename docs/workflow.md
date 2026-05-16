## How NovaMail Was Built

NovaMail was developed entirely through **Claude Code CLI** using the **Agent OS methodology** — a structured multi-agent workflow where a single Claude Opus 4.7 instance assumes specialized roles (planner, frontend, backend, auth, AI, testing, deployment) based on the current development phase. Each agent operates within bounded responsibilities, communicates through typed contracts, and has explicit entry/exit checkpoints.

The entire build followed a **specs-driven development** pipeline: write specifications first, then implement against them, then test against them.

---

## Phase 1: Planning & Specification (planner-agent)

**Duration:** First session  
**Approach:** Requirements-first analysis

The `planner-agent` analyzed the assignment requirements and produced two specification documents before any code was written:

1. **`specs/product-spec.md`** — Defined the feature matrix (unified inbox, multi-provider, compose/reply/forward, search, labels, archive/delete, AI summaries/replies/priority), user flows, design principles, and explicit out-of-scope items (no contacts, calendar, tasks, notes).

2. **`specs/technical-spec.md`** — Selected the technology stack, defined all tRPC endpoints with input/output types, specified the database schema, documented the AI engine architecture with fallback strategy, and set performance targets.

**Key decision:** Chose IMAP direct protocol over provider-specific APIs (Gmail API, Microsoft Graph) because one engine handles all providers universally. This is the core architectural bet that makes NovaMail truly universal.

**Deliverable:** `CLAUDE.md` was authored as the project's persistent memory — architecture rationale, coding standards, agent registry, and implementation phases. Claude Code reads this file at session start to maintain context continuity.

---

## Phase 2: Foundation (backend-agent + auth-agent)

**Duration:** Second session  
**Approach:** Schema-first, contract-first

The `backend-agent` laid the foundation:
- Scaffolded Vite + React 19 + TypeScript project
- Designed 6-table SQLite schema (`users`, `email_accounts`, `folders`, `emails`, `attachments`, `settings`)
- Configured Drizzle ORM with WAL mode for concurrent read/write
- Established tRPC router registry with Hono HTTP server
- Set up path aliases (`@/`, `@contracts/`, `@db/`)

The `auth-agent` then built the authentication system:
- Implemented IMAP-based credential verification (no OAuth dependency — validates by actually connecting to the mail server)
- Built JWT session management with `jose` library
- Created auth middleware that injects user context into every tRPC procedure
- Designed auto-detection of provider settings from email domain (`@gmail.com` → `imap.gmail.com:993`)

**Checkpoint:** Login with Gmail App Password → JWT session → authenticated tRPC calls → logout.

---

## Phase 3: Core Email (backend-agent)

**Duration:** Third session  
**Approach:** Engine-first, then routers

The `backend-agent` built the email protocol layer:

**IMAP Engine (`api/lib/imap-engine.ts`):**
- Connection pooling with 5-minute TTL and lazy creation
- UID-based operations for stable message references
- Folder listing with system folder detection (Inbox, Sent, Drafts, Trash, Archive)
- Email fetch with `BODY[]` + `FLAGS` using mailparser for full MIME parsing
- Flag management: mark read/unread, star/unstar
- Email move operations for archive (→ All Mail) and delete (→ Trash)
- Search via IMAP SEARCH command (subject, from, to matching)

**SMTP Engine (`api/lib/smtp-engine.ts`):**
- Provider-aware transporter configuration (Gmail, Outlook, Yahoo, custom)
- TLS transport with configurable security settings
- HTML + plain text body support
- CC/BCC support

**tRPC Routers:**
- `account-router.ts` — 8 procedures for account CRUD, folder listing, folder status
- `email-router.ts` — 14 procedures covering inbox, get, search, send, reply, forward, mark read/unread, toggle star, archive, delete, and 3 AI endpoints

**Checkpoint:** Fetching real emails from Gmail via IMAP, sending replies via SMTP, all type-safe through tRPC.

---

## Phase 4: UI/UX (frontend-agent)

**Duration:** Fourth session  
**Approach:** Component architecture → layout → polish

The `frontend-agent` built the UI layer against the tRPC API contracts:

**Layout architecture:**
- Desktop: Three-panel layout (sidebar → email list → email detail)
- Mobile (<768px): Drawer navigation with swipe gestures
- Auth guard: `AuthLayout` component wraps all routes, redirects to login if unauthenticated

**Core components:**
- `InboxView` — Email list with search bar, pagination, skeleton loaders, empty states
- `EmailDetail` — Full email reader with HTML content rendering, metadata display, action toolbar (reply, forward, archive, delete, star), and AI feature panels
- `ComposeModal` — Multi-purpose compose dialog for new emails, replies, and forwards with CC support
- `AppSidebar` — Desktop sidebar with account info, folder tree, compose button
- `AccountSwitcher` — Dropdown selector for switching between connected email accounts
- `MobileDrawer` — Responsive drawer navigation for mobile viewports

**Design system:**
- shadcn/ui components (Button, Dialog, DropdownMenu, ScrollArea, Separator, Skeleton, etc.)
- Tailwind CSS with custom design tokens
- Lucide icons throughout
- Glassmorphism login page with backdrop blur effects
- Loading skeletons for every data-dependent component
- Error states with retry actions
- Toast notifications via Sonner

**Checkpoint:** Full email workflow — login → view inbox → read email → compose reply → send — working on both desktop and mobile.

---

## Phase 5: AI Features (ai-agent)

**Duration:** Fifth session  
**Approach:** AI-first but never AI-dependent

The `ai-agent` implemented the intelligence layer with a strict **dual-path guarantee**: every AI feature works with Gemini API when available and falls back to local heuristics when not.

**AI capabilities:**
| Feature | AI Path (Gemini) | Heuristic Fallback |
|---------|-----------------|-------------------|
| **Summarize** | 2–3 sentence summary + key points via LLM | First-sentence extraction + bullet detection |
| **Reply Draft** | Tone-aware reply generation (Professional/Friendly/Brief) | Template-based replies by tone |
| **Priority** | High/Medium/Low classification with reasoning | Keyword matching (urgent, deadline → high) |

**Prompt engineering approach:**
- System prompts define strict output format (e.g., `SUMMARY: ... KEY_POINTS: - ...`)
- User prompts include email context: Subject + From + cleaned body
- Input sanitization: HTML tags stripped, URLs removed, whitespace collapsed, truncated to 3000 chars
- Response parsing: Regex-based extraction (not JSON parsing — more resilient to LLM format variations)
- Temperature: 0.3 (deterministic), max tokens: 512, timeout: 25s with 1 retry

**Source attribution:** UI displays whether each AI result came from "AI" or "heuristic", giving users transparency into confidence levels.

**Checkpoint:** AI summaries generating in 3–8s, heuristic fallbacks in <50ms, source badges displaying correctly, app fully functional with `GEMINI_API_KEY` unset.

---

## Phase 6: PWA & Testing (testing-agent + deployment-agent)

**Duration:** Sixth session  
**Approach:** Test what matters, deploy with confidence

The `testing-agent` implemented the test suite:
- **Unit tests** (`tests/ai-engine.test.ts`): Vitest tests for all three heuristic algorithms — priority classification, summary generation, key point extraction
- **E2E tests** (`tests/smoke.spec.ts`): Playwright tests for page loads, login accessibility, PWA manifest validation
- **Type safety**: `tsc -b` with zero errors across the full project
- **Lint**: ESLint with React hooks and refresh plugins

The `deployment-agent` configured production deployment:
- Vite production build → `dist/public/` (static SPA assets)
- esbuild API bundle → `dist/boot.js` (serverless function)
- PWA manifest with app icons (192x192, 512x512)
- Service worker with Workbox precaching (5MB budget)
- `vercel.json` with route configuration, serverless function routing, security headers, and SPA fallback

**Checkpoint:** `npm run build` succeeds, `npm run test` all green, `npm run check` zero errors, PWA installable on mobile.

---

## Claude Code Discipline

Throughout the entire build, Claude Code maintained these disciplines:

| Practice | How It Was Applied |
|----------|-------------------|
| **CLAUDE.md as project memory** | Read at every session start. Updated after major decisions. Contains architecture rationale, coding standards, agent registry, and phase tracking. |
| **Specs-driven development** | Product spec and technical spec written before implementation. All features traced back to spec requirements. |
| **Agent role boundaries** | Each agent had defined entry/exit conditions. No agent modified files outside its domain without explicit handoff. |
| **Type-safe contracts** | tRPC + Zod + Drizzle schema = compile-time safety from database to UI. Zero runtime type errors. |
| **AI graceful degradation** | Every AI feature has a tested heuristic fallback. The app never breaks when the LLM is unavailable. |
| **Checkpoint verification** | Each phase ended with explicit checkpoint validation before proceeding to the next. |
| **Automated testing** | Unit tests for core logic, E2E tests for critical flows, type checking, and linting — all runnable with a single command. |

---

## Commands Reference

```bash
# Development
npm run dev          # Start Vite dev server with Hono API (port 3000)

# Build
npm run build        # Vite SPA build + esbuild API bundle

# Testing
npm run test         # Vitest unit tests
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright E2E smoke tests
npm run check        # TypeScript type checking
npm run lint         # ESLint code quality

# Database
npm run db:push      # Push schema changes to SQLite
npm run db:generate  # Generate migration files
npm run db:migrate   # Run pending migrations

# Production
npm run start        # Start production server (requires build first)
```
]]>
