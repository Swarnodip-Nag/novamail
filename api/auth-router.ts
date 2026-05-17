import { z } from "zod";
import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { ImapFlow } from "imapflow";
import { Session } from "../contracts/constants.js";
import { getSessionCookieOptions } from "./lib/cookies.js";
import { createRouter, authedQuery, publicQuery } from "./middleware.js";
import { signSessionToken } from "./lib/auth.js";
import { upsertUserByEmail, findUserByEmail } from "./queries/users.js";
import { getDb } from "./queries/connection.js";
import { emailAccounts } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

// ─── IMAP Connection Tester ──────────────────────────────────────
async function testImapConnection(opts: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = new ImapFlow({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: {
      user: opts.username,
      pass: opts.password,
    },
    logger: false,
    emitLogs: false,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });

  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err: unknown) {
    console.error("[IMAP] Connection test failed:", err);
    try { await client.close(); } catch { /* ignore */ }
    // ImapFlow puts the real error in responseText / serverResponseCode
    const imapErr = err as { responseText?: string; serverResponseCode?: string; message?: string };
    const detail = imapErr.responseText || imapErr.serverResponseCode || imapErr.message || String(err);
    return { ok: false, error: detail };
  }
}

// ─── Provider Defaults ───────────────────────────────────────────
function getProviderDefaults(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  if (domain === "gmail.com" || domain === "googlemail.com") {
    return {
      provider: "gmail" as const,
      imapHost: "imap.gmail.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpSecure: false,
    };
  }
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com" || domain === "microsoft.com") {
    return {
      provider: "microsoft365" as const,
      imapHost: "outlook.office365.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.office365.com",
      smtpPort: 587,
      smtpSecure: false,
    };
  }
  if (domain === "yahoo.com" || domain === "ymail.com") {
    return {
      provider: "imap" as const,
      imapHost: "imap.mail.yahoo.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.mail.yahoo.com",
      smtpPort: 587,
      smtpSecure: false,
    };
  }

  return {
    provider: "imap" as const,
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
  };
}

// ─── Auth Input Schema ───────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().optional(),
  // IMAP override (optional — auto-detected by default)
  imapHost: z.string().optional(),
  imapPort: z.number().optional(),
  imapSecure: z.boolean().optional(),
  // SMTP override (optional)
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecure: z.boolean().optional(),
});

// ─── Auth Router ─────────────────────────────────────────────────
export const authRouter = createRouter({
  // Get current user
  me: authedQuery.query((opts) => opts.ctx.user),

  // Get provider defaults for email domain
  providerDefaults: publicQuery
    .input(z.object({ email: z.string().email() }))
    .query(({ input }) => getProviderDefaults(input.email)),

  // Login / Signup (both use IMAP verification)
  login: publicQuery
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const defaults = getProviderDefaults(input.email);

      const imapHost = input.imapHost || defaults.imapHost;
      const imapPort = input.imapPort ?? defaults.imapPort;
      const imapSecure = input.imapSecure ?? defaults.imapSecure;
      const smtpHost = input.smtpHost || defaults.smtpHost;
      const smtpPort = input.smtpPort ?? defaults.smtpPort;
      const smtpSecure = input.smtpSecure ?? defaults.smtpSecure;

      if (!imapHost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not detect IMAP server. Please enter your IMAP settings manually.",
        });
      }

      // For Gmail app passwords, strip spaces (Google shows them with spaces
      // but IMAP auth requires them without)
      const imapPassword = defaults.provider === "gmail"
        ? input.password.replace(/\s+/g, "")
        : input.password;

      // Verify credentials via IMAP
      const result = await testImapConnection({
        host: imapHost,
        port: imapPort,
        secure: imapSecure,
        username: input.email,
        password: imapPassword,
      });

      if (!result.ok) {
        // Parse common IMAP errors into user-friendly messages
        let message = result.error;
        if (result.error.includes("AUTHENTICATIONFAILED") || result.error.includes("Invalid credentials")) {
          message = "Authentication failed — double-check your email and app password. For Gmail, make sure you're using an App Password (not your regular Google password).";
        } else if (result.error.includes("ETIMEDOUT") || result.error.includes("connectionTimeout")) {
          message = "Could not reach the mail server — check your internet connection or try again.";
        } else if (result.error.includes("ENOTFOUND")) {
          message = "Mail server not found — check the IMAP host in advanced settings.";
        }
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message,
        });
      }

      // Upsert user
      const user = await upsertUserByEmail({
        email: input.email,
        name: input.displayName,
      });

      // Upsert email account
      const db = getDb();
      const existingAccount = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.userId, user.id),
            eq(emailAccounts.email, input.email)
          )
        )
        .limit(1);

      if (existingAccount.length === 0) {
        await db.insert(emailAccounts).values({
          userId: user.id,
          name: user.name ?? input.email,
          email: input.email,
          provider: defaults.provider,
          authType: "password",
          imapHost,
          imapPort,
          imapSecure,
          imapUsername: input.email,
          imapPassword: imapPassword,
          smtpHost,
          smtpPort,
          smtpSecure,
          smtpUsername: input.email,
          smtpPassword: imapPassword,
          isDefault: true,
        });
      } else {
        // Update password in case it changed
        await db
          .update(emailAccounts)
          .set({
            imapPassword: imapPassword,
            smtpPassword: imapPassword,
          })
          .where(eq(emailAccounts.id, existingAccount[0].id));
      }

      // Create session
      const token = await signSessionToken({ userId: user.id });
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: cookieOpts.httpOnly,
          path: cookieOpts.path,
          sameSite: cookieOpts.sameSite?.toLowerCase() as "lax" | "none" | "strict",
          secure: cookieOpts.secure,
          maxAge: Session.maxAgeMs / 1000,
        }),
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      };
    }),

  // Logout
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
