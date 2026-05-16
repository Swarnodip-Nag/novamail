## System Architecture

```
┌────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                     │
│  React 19 · TypeScript · Vite 7 · Tailwind CSS    │
│  shadcn/ui · Radix UI · Zustand · React Query     │
│                                                     │
│  Components: InboxView, EmailDetail, ComposeModal, │
│  AppSidebar, AccountSwitcher, MobileDrawer         │
│  Routing: React Router 7 · PWA: vite-plugin-pwa   │
└─────────────────────┬───────────────────────────────┘
                      │ tRPC v11 (end-to-end type-safe)
┌─────────────────────▼───────────────────────────────┐
│                   API LAYER                          │
│             Hono HTTP Server + tRPC                  │
│                                                      │
│  Routers: account-router (CRUD, folders, status)    │
│           email-router (inbox, send, reply, forward, │
│             search, star, archive, delete,           │
│             aiSummary, aiReply, aiPriority)          │
│  Auth: JWT sessions · IMAP credential verification  │
└──┬────────────────────┬─────────────────┬────────────┘
   │                    │                 │
┌──▼──────────┐  ┌──────▼──────┐  ┌──────▼──────────┐
│ IMAP Engine │  │ SMTP Engine │  │   AI Engine     │
│ (imapflow)  │  │ (nodemailer)│  │ (Gemini API +   │
│             │  │             │  │  heuristic      │
│ • Pool 5min │  │ • TLS       │  │  fallbacks)     │
│ • UID ops   │  │ • Provider  │  │                 │
│ • Folders   │  │   aware     │  │ • Summarize     │
│ • Flags     │  │ • HTML+text │  │ • Reply draft   │
│ • Search    │  │             │  │ • Prioritize    │
└──────┬──────┘  └──────┬──────┘  └────────┬────────┘
       │                │                   │
┌──────▼────────────────▼─────┐   ┌────────▼────────┐
│     Email Providers          │   │  Gemini API     │
│ Gmail · Outlook · Yahoo     │   │  gemini-3.1-    │
│ AOL · Custom IMAP           │   │  flash-lite     │
└─────────────────────────────┘   └─────────────────┘
       │
┌──────▼──────────────────────┐
│       DATA LAYER            │
│  SQLite + Drizzle ORM      │
│  WAL mode · 6 tables       │
│  users · email_accounts    │
│  folders · emails          │
│  attachments · settings    │
└─────────────────────────────┘
```

## Core Data Flows

### Reading Emails
```
User → trpc.email.inbox.useQuery() → Zod validation → DB account lookup
  → IMAP connect (pooled, TLS) → FETCH BODY[]+FLAGS → mailparser → tRPC → React Query cache → UI render
```

### Sending Emails
```
User → trpc.email.send.useMutation() → Zod validation → DB SMTP credentials
  → nodemailer TLS transporter → Provider SMTP → Toast notification → Invalidate inbox
```

### AI Processing
```
Email opened → Strip HTML/URLs → Truncate (3000 chars)
  → System prompt + email context → Gemini API (temp=0.3, 25s timeout)
  → Success? Parse regex → "AI" badge | Failure? → Heuristic fallback → "heuristic" badge
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| No email storage | IMAP on-demand | Privacy-first. No content persisted on server. |
| SQLite over Postgres | File-based DB | Zero-infra MVP. WAL handles concurrency. Swap to Turso for scale. |
| tRPC over REST | Type-safe RPC | Compile-time safety from DB → API → UI. Zero API drift. |
| Heuristic fallbacks | Every AI feature | App works without API key. AI enhances, never gates. |
| IMAP over provider APIs | Direct protocol | Universal: one engine for Gmail, Outlook, Yahoo, AOL, custom. |
| JWT over sessions | Stateless auth | No session store. Works with Vercel serverless. |

## Security Model

- **Transport:** All IMAP/SMTP over TLS. HttpOnly, SameSite cookies.
- **Auth:** JWT signed with `SESSION_SECRET`. Credentials filtered from API responses.
- **Validation:** Every tRPC input validated with Zod. No trust-the-client patterns.
- **AI safety:** Email content stripped of HTML/URLs and truncated before LLM processing.

## Performance

| Metric | Target | Status |
|--------|--------|--------|
| First Contentful Paint | < 1.5s | ✅ |
| Time to Interactive | < 3s | ✅ |
| Bundle size (gzipped) | < 600KB | ✅ ~594KB |
| IMAP fetch | < 2s | ✅ |
| AI response | < 15s | ✅ 3–8s (Gemini) / <50ms (heuristic) |
]]>
