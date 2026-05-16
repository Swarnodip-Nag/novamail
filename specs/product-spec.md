# NovaMail Product Specification

## Product Overview

NovaMail is an AI-first universal email client designed for professionals who need to manage multiple email accounts efficiently. It combines the simplicity of modern email clients with AI-powered features that help users process emails faster.

## Target Users

- Professionals managing multiple email accounts
- Users who want AI assistance with email processing
- Mobile-first email users
- Privacy-conscious users (local data, no third-party email API)

## Value Proposition

- **Unified Inbox**: One interface for Gmail, Outlook, Yahoo, and custom IMAP accounts
- **AI Summary**: Instantly understand long emails
- **AI Reply**: Generate professional reply drafts
- **AI Priority**: Know which emails need attention first
- **Privacy First**: Direct IMAP connection, no email data stored on servers

## Feature Matrix

### Core Email (MVP)
| Feature | Status | Notes |
|---------|--------|-------|
| Unified inbox | Done | Per-account folder view |
| Multi-account | Done | Gmail, M365, IMAP |
| Read emails | Done | Full HTML/text rendering |
| Compose email | Done | With CC support |
| Reply | Done | With context preservation |
| Forward | Done | With original quoted |
| Search | Done | Subject/from/to search |
| Archive | Done | Moves to archive folder |
| Delete | Done | Moves to trash |
| Star | Done | Toggle flagged status |
| Mark read/unread | Done | IMAP flag management |

### AI Features (MVP)
| Feature | Status | Notes |
|---------|--------|-------|
| AI Summary | Done | 2-3 sentence + key points |
| AI Reply Draft | Done | 3 tone options |
| AI Priority | Done | High/medium/low |
| Fallback heuristics | Done | Works without API key |

### UI/UX (MVP)
| Feature | Status | Notes |
|---------|--------|-------|
| Light theme | Done | Primary theme |
| Sidebar navigation | Done | Desktop |
| Mobile drawer | Done | Responsive |
| Account switcher | Done | Dropdown |
| Loading skeletons | Done | All data states |
| Empty states | Done | Inbox, search |
| Error states | Done | With retry |

### PWA (MVP)
| Feature | Status | Notes |
|---------|--------|-------|
| Installable | Done | Via manifest |
| Offline shell | Done | Service worker |
| App icons | Done | Generated |

### Out of Scope
- Contacts management
- Calendar integration
- Tasks/notes
- Chat/messaging
- Team collaboration
- RBAC
- Real-time sync

## User Flows

### Add Email Account
1. Click "Add Account" button
2. Select provider (Gmail, M365, IMAP)
3. Enter display name and email
4. For password auth: enter IMAP/SMTP credentials
5. Account saved, folders listed

### Read Email
1. Select account from switcher
2. Select folder from sidebar
3. Click email from list
4. View content with AI summary
5. Use AI reply draft if needed

### Compose Email
1. Click "Compose" button
2. Enter recipient, subject, body
3. Send email via SMTP

### Search Emails
1. Enter query in search bar
2. Results filtered in real-time
3. Click result to view

## Design Principles

- **Clarity**: Clean layout with clear hierarchy
- **Speed**: Fast actions, instant feedback
- **Intelligence**: AI features that feel natural
- **Reliability**: Graceful degradation when AI is unavailable
- **Privacy**: Direct connections, minimal data storage
