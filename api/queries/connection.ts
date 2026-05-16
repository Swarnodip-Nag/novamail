import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let database: Database.Database;

export function getDb() {
  if (!instance) {
    // Resolve the database path robustly across platforms
    const rawPath = env.databaseUrl.replace(/^file:/, "");
    const dbPath = path.resolve(process.cwd(), rawPath);

    // Ensure the data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log("[DB] Opening database at:", dbPath);
    database = new Database(dbPath);
    database.pragma("journal_mode = WAL");

    // Ensure tables exist by running a self-check
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
    if (tables.length === 0) {
      console.warn("[DB] ⚠ 'users' table not found — creating schema...");
      database.exec(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "unionId" text NOT NULL,
          "name" text,
          "email" text,
          "avatar" text,
          "role" text DEFAULT 'user' NOT NULL,
          "createdAt" integer,
          "updatedAt" integer,
          "lastSignInAt" integer
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "users_unionId_unique" ON "users" ("unionId");

        CREATE TABLE IF NOT EXISTS "email_accounts" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "user_id" integer NOT NULL,
          "name" text NOT NULL,
          "email" text NOT NULL,
          "provider" text NOT NULL,
          "auth_type" text NOT NULL,
          "access_token" text,
          "refresh_token" text,
          "token_expiry" integer,
          "imap_host" text,
          "imap_port" integer,
          "imap_secure" integer DEFAULT true,
          "imap_username" text,
          "imap_password" text,
          "smtp_host" text,
          "smtp_port" integer,
          "smtp_secure" integer DEFAULT true,
          "smtp_username" text,
          "smtp_password" text,
          "last_sync_at" integer,
          "is_active" integer DEFAULT true,
          "is_default" integer DEFAULT false,
          "created_at" integer,
          "updated_at" integer
        );

        CREATE TABLE IF NOT EXISTS "folders" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "account_id" integer NOT NULL,
          "name" text NOT NULL,
          "display_name" text NOT NULL,
          "path" text NOT NULL,
          "total_count" integer DEFAULT 0,
          "unread_count" integer DEFAULT 0,
          "is_system" integer DEFAULT false,
          "sync_enabled" integer DEFAULT true,
          "created_at" integer
        );

        CREATE TABLE IF NOT EXISTS "emails" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "account_id" integer NOT NULL,
          "folder_id" integer NOT NULL,
          "uid" integer NOT NULL,
          "message_id" text,
          "thread_id" text,
          "subject" text,
          "from_address" text,
          "from_name" text,
          "to_addresses" text,
          "cc_addresses" text,
          "bcc_addresses" text,
          "reply_to" text,
          "date" integer,
          "received_at" integer,
          "body_text" text,
          "body_html" text,
          "snippet" text,
          "is_read" integer DEFAULT false,
          "is_starred" integer DEFAULT false,
          "is_archived" integer DEFAULT false,
          "is_draft" integer DEFAULT false,
          "is_sent" integer DEFAULT false,
          "is_trash" integer DEFAULT false,
          "ai_summary" text,
          "ai_priority" text,
          "ai_reply_draft" text,
          "labels" text,
          "headers_hash" text,
          "created_at" integer
        );

        CREATE TABLE IF NOT EXISTS "attachments" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "email_id" integer NOT NULL,
          "filename" text,
          "content_type" text,
          "size" integer,
          "content_id" text,
          "created_at" integer
        );

        CREATE TABLE IF NOT EXISTS "settings" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "user_id" integer NOT NULL,
          "theme" text DEFAULT 'light',
          "ai_enabled" integer DEFAULT true,
          "ai_auto_summarize" integer DEFAULT false,
          "ai_auto_draft" integer DEFAULT false,
          "compact_view" integer DEFAULT false,
          "created_at" integer,
          "updated_at" integer
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "settings_user_id_unique" ON "settings" ("user_id");
      `);
      console.log("[DB] ✓ Schema created successfully");
    } else {
      console.log("[DB] ✓ Database schema verified");
    }

    instance = drizzle(database, { schema: fullSchema });
  }
  return instance;
}

export function closeDb() {
  if (database) {
    database.close();
  }
}
