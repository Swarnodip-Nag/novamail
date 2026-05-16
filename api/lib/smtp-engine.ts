import { createTransport, type Transporter } from "nodemailer";
import type { EmailAccount } from "@db/schema";

// ─── SMTP Transporter Pool ───────────────────────────────────────
const transporters = new Map<number, { transporter: Transporter; lastUsed: number }>();
const CONNECTION_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Send Email ──────────────────────────────────────────────────
export interface SendEmailOptions {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
}

export async function sendEmail(
  account: EmailAccount,
  options: SendEmailOptions
): Promise<{ messageId: string }> {
  const transporter = await getTransporter(account);

  const from = account.name
    ? `"${account.name}" <${account.email}>`
    : account.email;

  const info = await transporter.sendMail({
    from,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.bodyText,
    html: options.bodyHtml,
    inReplyTo: options.inReplyTo,
    references: options.references,
    headers: options.threadId ? { "X-Thread-ID": options.threadId } : undefined,
  });

  return { messageId: info.messageId };
}

// ─── Transporter Management ──────────────────────────────────────
async function getTransporter(account: EmailAccount): Promise<Transporter> {
  const existing = transporters.get(account.id);
  if (existing) {
    if (Date.now() - existing.lastUsed < CONNECTION_TIMEOUT_MS) {
      existing.lastUsed = Date.now();
      return existing.transporter;
    }
    transporters.delete(account.id);
  }

  const transporter = createTransporter(account);
  transporters.set(account.id, { transporter, lastUsed: Date.now() });
  return transporter;
}

function createTransporter(account: EmailAccount): Transporter {
  const host = account.smtpHost || getDefaultSmtpHost(account.provider);
  const port = account.smtpPort || getDefaultSmtpPort(account.provider);
  const secure = account.smtpSecure ?? true;
  const user = account.smtpUsername || account.email;
  const pass = account.smtpPassword || account.imapPassword || "";

  return createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 60000,
  });
}

function getDefaultSmtpHost(provider: string): string {
  switch (provider) {
    case "gmail":
      return "smtp.gmail.com";
    case "microsoft365":
      return "smtp.office365.com";
    default:
      return "";
  }
}

function getDefaultSmtpPort(provider: string): number {
  switch (provider) {
    case "gmail":
      return 465;
    case "microsoft365":
      return 587;
    default:
      return 587;
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────
export function clearTransporters(): void {
  for (const [, { transporter }] of transporters) {
    transporter.close();
  }
  transporters.clear();
}
