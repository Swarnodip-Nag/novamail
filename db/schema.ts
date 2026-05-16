import {
  sqliteTable,
  integer,
  text,
} from "drizzle-orm/sqlite-core";

// ─── Users (managed by Kimi OAuth) ──────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  unionId: text("unionId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Email Accounts (IMAP/SMTP connections) ─────────────────────
export const emailAccounts = sqliteTable("email_accounts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  // Account display info
  name: text("name").notNull(), // e.g. "Work Gmail"
  email: text("email").notNull(),
  // Provider type
  provider: text("provider", { enum: ["gmail", "microsoft365", "imap"] }).notNull(),
  // Auth type: oauth or password
  authType: text("auth_type", { enum: ["oauth", "password"] }).notNull(),
  // OAuth tokens (for Gmail/Microsoft)
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: integer("token_expiry", { mode: "timestamp" }),
  // IMAP credentials (for manual IMAP or OAuth fallback)
  imapHost: text("imap_host"),
  imapPort: integer("imap_port"),
  imapSecure: integer("imap_secure", { mode: "boolean" }).default(true),
  imapUsername: text("imap_username"),
  imapPassword: text("imap_password"),
  // SMTP credentials
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpSecure: integer("smtp_secure", { mode: "boolean" }).default(true),
  smtpUsername: text("smtp_username"),
  smtpPassword: text("smtp_password"),
  // Sync state
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = typeof emailAccounts.$inferInsert;

// ─── Folders (IMAP mailboxes) ───────────────────────────────────
export const folders = sqliteTable("folders", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(), // IMAP folder name e.g. "INBOX"
  displayName: text("display_name").notNull(), // User-friendly name
  path: text("path").notNull(), // Full IMAP path
  totalCount: integer("total_count").default(0),
  unreadCount: integer("unread_count").default(0),
  isSystem: integer("is_system", { mode: "boolean" }).default(false),
  syncEnabled: integer("sync_enabled", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

// ─── Emails ──────────────────────────────────────────────────────
export const emails = sqliteTable("emails", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull(),
  folderId: integer("folder_id").notNull(),
  // Unique identifiers
  uid: integer("uid").notNull(), // IMAP UID
  messageId: text("message_id"), // RFC Message-ID header
  threadId: text("thread_id"), // For conversation grouping
  // Email metadata
  subject: text("subject"),
  fromAddress: text("from_address"),
  fromName: text("from_name"),
  toAddresses: text("to_addresses"), // JSON array
  ccAddresses: text("cc_addresses"), // JSON array
  bccAddresses: text("bcc_addresses"), // JSON array
  replyTo: text("reply_to"),
  // Dates
  date: integer("date", { mode: "timestamp" }),
  receivedAt: integer("received_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  // Content
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  snippet: text("snippet"), // Preview text
  // Flags
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  isStarred: integer("is_starred", { mode: "boolean" }).default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  isDraft: integer("is_draft", { mode: "boolean" }).default(false),
  isSent: integer("is_sent", { mode: "boolean" }).default(false),
  isTrash: integer("is_trash", { mode: "boolean" }).default(false),
  // AI features
  aiSummary: text("ai_summary"),
  aiPriority: text("ai_priority", { enum: ["high", "medium", "low"] }),
  aiReplyDraft: text("ai_reply_draft"),
  // Labels (JSON array of label strings)
  labels: text("labels"), // JSON array
  // Raw headers reference
  headersHash: text("headers_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;

// ─── Email Attachments ───────────────────────────────────────────
export const attachments = sqliteTable("attachments", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  emailId: integer("email_id").notNull(),
  filename: text("filename"),
  contentType: text("content_type"),
  size: integer("size"),
  contentId: text("content_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

// ─── App Settings ────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique(),
  theme: text("theme", { enum: ["light", "dark", "system"] }).default("light"),
  aiEnabled: integer("ai_enabled", { mode: "boolean" }).default(true),
  aiAutoSummarize: integer("ai_auto_summarize", { mode: "boolean" }).default(false),
  aiAutoDraft: integer("ai_auto_draft", { mode: "boolean" }).default(false),
  compactView: integer("compact_view", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = typeof settings.$inferInsert;
