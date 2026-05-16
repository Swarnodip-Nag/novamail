import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { emailAccounts } from "@db/schema";
import { listFolders, getFolderStatus } from "../lib/imap-engine";
import type { EmailAccount } from "@db/schema";

export const accountRouter = createRouter({
  // List all accounts for the current user
  list: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const accounts = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, input.userId))
        .orderBy(emailAccounts.createdAt);

      return accounts.map((account) => ({
        ...account,
        imapPassword: undefined,
        smtpPassword: undefined,
      }));
    }),

  // Get a single account
  get: publicQuery
    .input(z.object({ id: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.id),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) return null;

      return {
        ...account,
        imapPassword: undefined,
        smtpPassword: undefined,
      };
    }),

  // Create a new account (IMAP/password)
  create: publicQuery
    .input(
      z.object({
        userId: z.number(),
        name: z.string().min(1),
        email: z.string().email(),
        provider: z.enum(["gmail", "microsoft365", "imap"]),
        authType: z.enum(["oauth", "password"]),
        imapHost: z.string().optional(),
        imapPort: z.number().optional(),
        imapSecure: z.boolean().optional(),
        imapUsername: z.string().optional(),
        imapPassword: z.string().optional(),
        smtpHost: z.string().optional(),
        smtpPort: z.number().optional(),
        smtpSecure: z.boolean().optional(),
        smtpUsername: z.string().optional(),
        smtpPassword: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .insert(emailAccounts)
        .values({
          userId: input.userId,
          name: input.name,
          email: input.email,
          provider: input.provider,
          authType: input.authType,
          imapHost: input.imapHost,
          imapPort: input.imapPort,
          imapSecure: input.imapSecure ?? true,
          imapUsername: input.imapUsername || input.email,
          imapPassword: input.imapPassword,
          smtpHost: input.smtpHost,
          smtpPort: input.smtpPort,
          smtpSecure: input.smtpSecure ?? true,
          smtpUsername: input.smtpUsername || input.email,
          smtpPassword: input.smtpPassword,
        })
        .returning();

      return {
        ...account,
        imapPassword: undefined,
        smtpPassword: undefined,
      };
    }),

  // Create OAuth account
  createOAuth: publicQuery
    .input(
      z.object({
        userId: z.number(),
        name: z.string().min(1),
        email: z.string().email(),
        provider: z.enum(["gmail", "microsoft365"]),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Set default SMTP/IMAP for known providers
      let imapHost: string | undefined;
      let imapPort: number | undefined;
      let smtpHost: string | undefined;
      let smtpPort: number | undefined;

      if (input.provider === "gmail") {
        imapHost = "imap.gmail.com";
        imapPort = 993;
        smtpHost = "smtp.gmail.com";
        smtpPort = 587;
      } else if (input.provider === "microsoft365") {
        imapHost = "outlook.office365.com";
        imapPort = 993;
        smtpHost = "smtp.office365.com";
        smtpPort = 587;
      }

      const [account] = await db
        .insert(emailAccounts)
        .values({
          userId: input.userId,
          name: input.name,
          email: input.email,
          provider: input.provider,
          authType: "oauth",
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          imapHost,
          imapPort,
          smtpHost,
          smtpPort,
          smtpSecure: true,
          isActive: true,
        })
        .returning();

      return {
        ...account,
        imapPassword: undefined,
        smtpPassword: undefined,
      };
    }),

  // Update account
  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        userId: z.number(),
        name: z.string().min(1).optional(),
        imapHost: z.string().optional(),
        imapPort: z.number().optional(),
        imapUsername: z.string().optional(),
        imapPassword: z.string().optional(),
        smtpHost: z.string().optional(),
        smtpPort: z.number().optional(),
        smtpUsername: z.string().optional(),
        smtpPassword: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, userId, ...updates } = input;

      const [account] = await db
        .update(emailAccounts)
        .set(updates)
        .where(
          and(
            eq(emailAccounts.id, id),
            eq(emailAccounts.userId, userId)
          )
        )
        .returning();

      return account;
    }),

  // Delete account
  delete: publicQuery
    .input(z.object({ id: z.number(), userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .delete(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.id),
            eq(emailAccounts.userId, input.userId)
          )
        );
      return { success: true };
    }),

  // Set default account
  setDefault: publicQuery
    .input(z.object({ id: z.number(), userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Unset all defaults
      await db
        .update(emailAccounts)
        .set({ isDefault: false })
        .where(eq(emailAccounts.userId, input.userId));

      // Set new default
      const [account] = await db
        .update(emailAccounts)
        .set({ isDefault: true })
        .where(eq(emailAccounts.id, input.id))
        .returning();

      return account;
    }),

  // List folders for an account
  listFolders: publicQuery
    .input(z.object({ id: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.id),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) return [];

      try {
        const folderList = await listFolders(account as EmailAccount);
        return folderList;
      } catch {
        // Return default folders if IMAP fails
        return [
          { name: "INBOX", path: "INBOX", displayName: "Inbox", delimiter: "/", flags: [] },
          { name: "Sent", path: "Sent", displayName: "Sent", delimiter: "/", flags: [] },
          { name: "Drafts", path: "Drafts", displayName: "Drafts", delimiter: "/", flags: [] },
          { name: "Trash", path: "Trash", displayName: "Trash", delimiter: "/", flags: [] },
          { name: "Archive", path: "Archive", displayName: "Archive", delimiter: "/", flags: [] },
        ];
      }
    }),

  // Get folder status (counts)
  folderStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        userId: z.number(),
        folderPath: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.id, input.id),
            eq(emailAccounts.userId, input.userId)
          )
        );

      if (!account) return { total: 0, unseen: 0 };

      try {
        return await getFolderStatus(account as EmailAccount, input.folderPath);
      } catch {
        return { total: 0, unseen: 0 };
      }
    }),
});
