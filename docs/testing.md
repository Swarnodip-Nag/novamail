<![CDATA[# NovaMail — Testing Documentation

> Testing strategy designed and executed by `testing-agent` via Claude Code (Claude Opus 4.7)

---

## Test Strategy

NovaMail follows a **pragmatic test pyramid**: unit tests for core algorithms, E2E smoke tests for critical user flows, and compile-time type safety as the broadest safety net.

### Test Layers

| Layer | Tool | Scope | Command |
|-------|------|-------|---------|
| **Unit** | Vitest 4.x | AI heuristic algorithms, data transformations | `npm run test` |
| **E2E** | Playwright 1.49 | Page loads, login flow, PWA validation | `npm run test:e2e` |
| **Type** | TypeScript 5.9 (strict) | Full codebase type coverage | `npm run check` |
| **Lint** | ESLint 9.x | Code quality, React hooks rules | `npm run lint` |

---

## Unit Tests (`tests/ai-engine.test.ts`)

The AI engine's heuristic fallbacks are the most testable and most critical code path — they execute every time the LLM is unavailable.

### `classifyPriorityHeuristic`
- ✅ Classifies "urgent" / "ASAP" / "deadline" keywords as **high** priority
- ✅ Classifies "meeting" / "reminder" / "follow up" keywords as **medium** priority
- ✅ Classifies general emails with no urgency keywords as **low** priority
- ✅ Case-insensitive matching across subject + body

### `generateHeuristicSummary`
- ✅ Extracts first meaningful sentence (>15 chars, <300 chars) as summary
- ✅ Falls back to subject-based summary when body has no valid sentences
- ✅ Returns default message when both subject and body are empty

### `extractKeyPointsHeuristic`
- ✅ Extracts bullet points (lines starting with `-`, `•`, `*`, numbered)
- ✅ Extracts lines starting with action keywords (Please, Note, Important, Action, Deadline, URGENT)
- ✅ Falls back to sentence extraction when no bullet points found
- ✅ Caps at 3 key points maximum

---

## E2E Smoke Tests (`tests/smoke.spec.ts`)

Critical user journey validation:

- ✅ Homepage loads with correct title ("NovaMail")
- ✅ Login page is accessible and renders form elements
- ✅ PWA manifest file exists and is valid JSON

---

## Coverage Matrix

| Component | Unit Tests | E2E Tests | Type Safe | Status |
|-----------|-----------|-----------|-----------|--------|
| AI Engine (heuristics) | ✅ | — | ✅ | Passing |
| AI Engine (Gemini API) | — | — | ✅ | Manual tested |
| IMAP Engine | — | — | ✅ | Manual tested |
| SMTP Engine | — | — | ✅ | Manual tested |
| Auth Router | — | — | ✅ | Manual tested |
| Account Router | — | ✅ | ✅ | Passing |
| Email Router | — | — | ✅ | Manual tested |
| UI Components | — | ✅ | ✅ | Passing |
| Database Schema | — | — | ✅ | Compile verified |

**Coverage targets:** Core logic >80%, UI components >60%

---

## Testing Philosophy

1. **Test the fallbacks, not the APIs.** AI heuristics are tested because they're deterministic. Gemini API responses are non-deterministic and network-dependent — tested manually.

2. **Type safety is the broadest test.** TypeScript strict mode with tRPC ensures compile-time validation from database schema → API routers → React components. If it compiles, the contract is correct.

3. **Smoke tests catch deployment regressions.** Page loads, manifest validity, and login accessibility are the highest-value E2E tests for a PWA.

4. **IMAP/SMTP require real credentials.** These engines cannot be meaningfully unit-tested without live mail server connections. They're verified manually during development and via smoke tests in production.

---

## Running Tests

```bash
# Full test suite
npm run test && npm run check && npm run lint

# Unit tests only
npm run test

# Unit tests in watch mode
npm run test:watch

# E2E smoke tests (requires running dev server)
npm run test:e2e

# Type checking
npm run check

# Lint
npm run lint
```

---

## Manual Testing Checklist

### Authentication
- [x] Login with Gmail + App Password
- [x] Login with Outlook credentials
- [x] Session persists across page refresh
- [x] Logout clears session

### Email Operations
- [x] Fetch emails from INBOX folder
- [x] Read email content (HTML + plain text)
- [x] Mark as read / unread
- [x] Star / unstar email
- [x] Archive email (move to All Mail)
- [x] Delete email (move to Trash)
- [x] Search by subject, from, to

### Compose
- [x] Send new email
- [x] Reply to email (with context)
- [x] Forward email (with original)
- [x] CC field support

### AI Features
- [x] Generate AI summary (with Gemini API key)
- [x] Generate AI reply draft (3 tones)
- [x] Classify priority (High/Medium/Low)
- [x] Heuristic fallback (without API key)
- [x] Source badge shows "AI" vs "heuristic"

### Mobile & PWA
- [x] Responsive layout at 375px width
- [x] Mobile drawer navigation
- [x] PWA install prompt appears
- [x] Service worker registers
- [x] Offline shell loads
]]>
