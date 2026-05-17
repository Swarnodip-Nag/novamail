import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware.js";
import { getDb } from "../queries/connection.js";
import { emailAccounts } from "../../db/schema.js";
import {
  fetchEmails,
  fetchEmailByUid,
  markAsRead,
  markAsUnread,
  toggleStar,
  moveEmail,
  deleteEmail,
} from "../lib/imap-engine.js";
import { sendEmail } from "../lib/smtp-engine.js";
import { summarizeEmail, generateReplyDraft, classifyPriority } from "../lib/ai-engine.js";
import type { EmailAccount } from "../../db/schema.js";

export const emailRouter = createRouter({
  // ─── Inbox ───────────────────────────────────────────────────
  inbox: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        limit: z.number().default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) {
        return { emails: [], total: 0 };
      }

      try {
        const messages = await fetchEmails(account as EmailAccount, input.folder, {
          limit: input.limit,
          offset: input.offset,
          search: input.search,
        });

        return { emails: messages, total: messages.length };
      } catch (error) {
        console.error("IMAP inbox error:", error);
        return { emails: [], total: 0 };
      }
    }),

  // ─── Get Single Email ────────────────────────────────────────
  get: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        uid: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) return null;

      try {
        const message = await fetchEmailByUid(account as EmailAccount, input.folder, input.uid);
        return message;
      } catch (error) {
        console.error("IMAP get error:", error);
        return null;
      }
    }),

  // ─── Search Emails ───────────────────────────────────────────
  search: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        query: z.string().min(1),
        folder: z.string().default("INBOX"),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) return { emails: [], total: 0 };

      try {
        const messages = await fetchEmails(account as EmailAccount, input.folder, {
          limit: input.limit,
          search: input.query,
        });

        return { emails: messages, total: messages.length };
      } catch (error) {
        console.error("Search error:", error);
        return { emails: [], total: 0 };
      }
    }),

  // ─── Send Email (Compose) ────────────────────────────────────
  send: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        to: z.string().email(),
        cc: z.string().optional(),
        bcc: z.string().optional(),
        subject: z.string(),
        bodyText: z.string(),
        bodyHtml: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      try {
        const result = await sendEmail(account as EmailAccount, {
          to: input.to,
          cc: input.cc,
          bcc: input.bcc,
          subject: input.subject,
          bodyText: input.bodyText,
          bodyHtml: input.bodyHtml,
        });

        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error("Send email error:", error);
        throw new Error(
          `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // ─── Reply to Email ──────────────────────────────────────────
  reply: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        uid: z.number(),
        bodyText: z.string(),
        bodyHtml: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      // Get original email for reply context
      const original = await fetchEmailByUid(account as EmailAccount, input.folder, input.uid);
      if (!original) throw new Error("Original email not found");

      const subject = original.subject?.startsWith("Re:")
        ? original.subject
        : `Re: ${original.subject || ""}`;

      const to = original.from.address;

      try {
        const result = await sendEmail(account as EmailAccount, {
          to,
          subject,
          bodyText: input.bodyText,
          bodyHtml: input.bodyHtml,
          inReplyTo: original.messageId,
          references: original.messageId ? [original.messageId] : undefined,
        });

        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error("Reply error:", error);
        throw new Error(
          `Failed to send reply: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // ─── Forward Email ───────────────────────────────────────────
  forward: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        uid: z.number(),
        to: z.string().email(),
        bodyText: z.string(),
        bodyHtml: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      const original = await fetchEmailByUid(account as EmailAccount, input.folder, input.uid);
      if (!original) throw new Error("Original email not found");

      const subject = original.subject?.startsWith("Fwd:")
        ? original.subject
        : `Fwd: ${original.subject || ""}`;

      const bodyText = `${input.bodyText}\n\n--- Forwarded Message ---\nFrom: ${original.from.name} <${original.from.address}>\nSubject: ${original.subject || ""}\n\n${original.bodyText || ""}`;

      try {
        const result = await sendEmail(account as EmailAccount, {
          to: input.to,
          subject,
          bodyText,
          bodyHtml: input.bodyHtml,
        });

        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error("Forward error:", error);
        throw new Error(
          `Failed to forward: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // ─── Mark as Read ────────────────────────────────────────────
  markRead: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        uid: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      try {
        await markAsRead(account as EmailAccount, input.folder, input.uid);
        return { success: true };
      } catch (error) {
        console.error("Mark read error:", error);
        throw new Error("Failed to mark as read");
      }
    }),

  // ─── Mark as Unread ──────────────────────────────────────────
  markUnread: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        uid: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      try {
        await markAsUnread(account as EmailAccount, input.folder, input.uid);
        return { success: true };
      } catch (error) {
        console.error("Mark unread error:", error);
        throw new Error("Failed to mark as unread");
      }
    }),

  // ─── Toggle Star ─────────────────────────────────────────────
  toggleStar: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        uid: z.number(),
        star: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      try {
        await toggleStar(account as EmailAccount, input.folder, input.uid, input.star);
        return { success: true };
      } catch (error) {
        console.error("Toggle star error:", error);
        throw new Error("Failed to toggle star");
      }
    }),

  // ─── Archive Email ───────────────────────────────────────────
  archive: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        uid: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      try {
        const archiveFolder = getArchiveFolder(account.provider);
        await moveEmail(account as EmailAccount, input.folder, input.uid, archiveFolder);
        return { success: true };
      } catch (error) {
        console.error("Archive error:", error);
        throw new Error("Failed to archive");
      }
    }),

  // ─── Delete Email ────────────────────────────────────────────
  delete: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        userId: z.number(),
        folder: z.string().default("INBOX"),
        uid: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.accountId),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      try {
        await deleteEmail(account as EmailAccount, input.folder, input.uid);
        return { success: true };
      } catch (error) {
        console.error("Delete error:", error);
        throw new Error("Failed to delete");
      }
    }),

  // ─── AI Summary ──────────────────────────────────────────────
  aiSummary: publicQuery
    .input(
      z.object({
        subject: z.string(),
        body: z.string(),
        from: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await summarizeEmail(input.subject, input.body, input.from);
      } catch (error) {
        console.error("AI summary error:", error);
        return {
          summary: "Could not generate summary.",
          keyPoints: [],
          source: "heuristic" as const,
        };
      }
    }),

  // ─── AI Reply Draft ──────────────────────────────────────────
  aiReply: publicQuery
    .input(
      z.object({
        subject: z.string(),
        body: z.string(),
        from: z.string(),
        to: z.string(),
        tone: z.enum(["professional", "friendly", "brief"]).default("professional"),
      })
    )
    .query(async ({ input }) => {
      try {
        return await generateReplyDraft(
          input.subject,
          input.body,
          input.from,
          input.to,
          input.tone
        );
      } catch (error) {
        console.error("AI reply error:", error);
        return {
          draft: "Thank you for your email. I'll get back to you shortly.",
          tone: input.tone,
          source: "template" as const,
        };
      }
    }),

  // ─── AI Priority ─────────────────────────────────────────────
  aiPriority: publicQuery
    .input(
      z.object({
        subject: z.string(),
        body: z.string(),
        from: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await classifyPriority(input.subject, input.body, input.from);
      } catch (error) {
        console.error("AI priority error:", error);
        return {
          priority: "medium" as const,
          reason: "Default priority",
          source: "heuristic" as const,
        };
      }
    }),
});

function getArchiveFolder(provider: string): string {
  switch (provider) {
    case "gmail":
      return "[Gmail]/All Mail";
    case "microsoft365":
      return "Archive";
    default:
      return "Archive";
  }
}
