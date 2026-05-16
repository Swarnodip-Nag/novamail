# NovaMail Technical Specification

## Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS 3.4
- **Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **State**: Zustand (email store), React Query (server state)
- **Router**: React Router 7

### Backend
- **Server**: Hono (HTTP framework)
- **API**: tRPC 11.x (end-to-end type safety)
- **ORM**: Drizzle ORM 0.45
- **Database**: SQLite (better-sqlite3 driver)

### Email
- **IMAP**: imapflow 1.x
- **SMTP**: nodemailer 6.x
- **Parsing**: mailparser 3.x

### AI
- **Provider**: NVIDIA NIM API
- **Model**: meta/llama-3.1-70b-instruct (configurable)
- **Fallback**: Local heuristic algorithms

### PWA
- **Plugin**: vite-plugin-pwa 0.21
- **Strategy**: generateSW (Workbox)

### Testing
- **Unit**: Vitest 2.x
- **E2E**: Playwright 1.49

## API Design

### tRPC Routers

#### account (publicQuery)
| Procedure | Type | Input | Output |
|-----------|------|-------|--------|
| list | query | { userId } | EmailAccount[] (safe) |
| get | query | { id, userId } | EmailAccount (safe) |
| create | mutation | { userId, name, email, provider, authType, ... } | EmailAccount |
| createOAuth | mutation | { userId, name, email, provider, accessToken } | EmailAccount |
| update | mutation | { id, userId, ...fields } | EmailAccount |
| delete | mutation | { id, userId } | { success } |
| setDefault | mutation | { id, userId } | EmailAccount |
| listFolders | query | { id, userId } | Folder[] |
| folderStatus | query | { id, userId, folderPath } | { total, unseen } |

#### email (publicQuery)
| Procedure | Type | Input | Output |
|-----------|------|-------|--------|
| inbox | query | { accountId, userId, folder, limit, offset, search } | { emails, total } |
| get | query | { accountId, userId, folder, uid } | EmailMessage |
| search | query | { accountId, userId, query, folder, limit } | { emails, total } |
| send | mutation | { accountId, userId, to, cc, subject, bodyText, bodyHtml } | { success, messageId } |
| reply | mutation | { accountId, userId, folder, uid, bodyText, bodyHtml } | { success, messageId } |
| forward | mutation | { accountId, userId, folder, uid, to, bodyText, bodyHtml } | { success, messageId } |
| markRead | mutation | { accountId, userId, folder, uid } | { success } |
| markUnread | mutation | { accountId, userId, folder, uid } | { success } |
| toggleStar | mutation | { accountId, userId, folder, uid, star } | { success } |
| archive | mutation | { accountId, userId, folder, uid } | { success } |
| delete | mutation | { accountId, userId, folder, uid } | { success } |
| aiSummary | query | { subject, body, from } | { summary, keyPoints, source } |
| aiReply | query | { subject, body, from, to, tone } | { draft, tone, source } |
| aiPriority | query | { subject, body, from } | { priority, reason, source } |

### Data Types

```typescript
interface EmailMessage {
  uid: number;
  messageId?: string;
  subject?: string;
  from: { address: string; name: string };
  to: Array<{ address: string; name: string }>;
  cc: Array<{ address: string; name: string }>;
  date?: Date;
  bodyText?: string;
  bodyHtml?: string;
  snippet?: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  headers: Record<string, string>;
}
```

## Database Schema

### Tables
- `users` - OAuth user accounts
- `email_accounts` - IMAP/SMTP connection configs
- `folders` - IMAP folder cache
- `emails` - Email metadata cache
- `attachments` - Attachment metadata
- `settings` - User preferences

## IMAP Engine

### Connection Management
- Connection pool with 5-minute TTL
- Lazy connection creation
- Auto-reconnect on stale connections
- Graceful cleanup on logout

### Email Operations
- **fetchEmails**: Search + paginated fetch with body parts
- **fetchEmailByUid**: Full source fetch with mailparser
- **markAsRead/markAsUnread**: Flag management
- **toggleStar**: Flagged status
- **moveEmail**: Inter-folder moves
- **deleteEmail**: Trash move with fallback

### Error Handling
- Connection timeout: 30s
- Lock timeout: 30s (implicit)
- Retry: 0 (fail fast for UX)
- Graceful fallback: Default folder list

## AI Engine

### NVIDIA NIM Integration
- Endpoint: `POST /v1/chat/completions`
- Model: Configurable (default: meta/llama-3.1-70b-instruct)
- Temperature: 0.3
- Max tokens: 512
- Timeout: 15s
- Retries: 2 with exponential backoff

### Fallback Heuristics
- **Summary**: First sentence extraction
- **Key Points**: Bullet detection or sentence extraction
- **Reply**: Template-based by tone (professional/friendly/brief)
- **Priority**: Keyword matching (urgent/deadline/meeting/etc)

### Prompt Templates
- Summary: System prompt with format specification (SUMMARY + KEY_POINTS)
- Reply: System prompt with tone instruction
- Priority: Classification with format (PRIORITY + REASON)

## PWA Configuration

### Manifest
- Name: NovaMail - AI Email Client
- Short name: NovaMail
- Theme: #ffffff
- Display: standalone
- Icons: 192x192, 512x512

### Service Worker
- Strategy: generateSW (Workbox)
- Precaching: JS, CSS, HTML, icons
- Max cache size: 5MB

## Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle size: < 600KB (current: ~594KB)
- API response: < 2s (IMAP fetch)
- AI response: < 15s (with fallback)

## Security Considerations

- OAuth 2.0 for authentication
- No email content stored in database
- IMAP passwords in SQLite (encrypted recommended for production)
- TLS for all IMAP/SMTP connections
- No credential exposure in API responses
