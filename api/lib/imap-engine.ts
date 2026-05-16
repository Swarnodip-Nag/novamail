import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { EmailAccount } from "@db/schema";

// ─── Connection Pool ─────────────────────────────────────────────
const connections = new Map<number, { client: ImapFlow; lastUsed: number }>();
const CONNECTION_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Connection Management ───────────────────────────────────────
export async function getImapConnection(
  account: EmailAccount
): Promise<ImapFlow> {
  const existing = connections.get(account.id);
  if (existing) {
    if (Date.now() - existing.lastUsed < CONNECTION_TIMEOUT_MS) {
      if (existing.client.usable) {
        existing.lastUsed = Date.now();
        return existing.client;
      }
    }
    try {
      await existing.client.logout();
    } catch {
      // Ignore logout errors
    }
    connections.delete(account.id);
  }

  const client = await createImapConnection(account);
  connections.set(account.id, { client, lastUsed: Date.now() });
  return client;
}

async function createImapConnection(account: EmailAccount): Promise<ImapFlow> {
  const host = account.imapHost || getDefaultImapHost(account.provider);
  const port = account.imapPort || getDefaultImapPort(account.provider);
  const secure = account.imapSecure ?? true;
  const username = account.imapUsername || account.email;
  const password = account.imapPassword || account.accessToken || "";

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: {
      user: username,
      pass: password,
    },
    logger: false,
    emitLogs: false,
    connectionTimeout: 30000,
    greetingTimeout: 16000,
    socketTimeout: 60000,
  });

  // Attach error handler to prevent unhandled crashes
  client.on("error", (err: Error) => {
    console.error("[IMAP] Connection error:", err.message);
    connections.delete(account.id);
  });

  await client.connect();
  return client;
}

function getDefaultImapHost(provider: string): string {
  switch (provider) {
    case "gmail":
      return "imap.gmail.com";
    case "microsoft365":
      return "outlook.office365.com";
    default:
      return "";
  }
}

function getDefaultImapPort(_provider: string): number {
  return 993;
}

// ─── Folder Operations ──────────────────────────────────────────
export async function listFolders(
  account: EmailAccount
): Promise<
  Array<{
    name: string;
    path: string;
    displayName: string;
    delimiter: string;
    flags: string[];
  }>
> {
  const client = await getImapConnection(account);
  const lock = await client.getMailboxLock("INBOX");

  try {
    const mailboxes = await client.list();
    return mailboxes.map((box) => ({
      name: box.name,
      path: box.path,
      displayName: box.name,
      delimiter: box.delimiter || "/",
      flags: box.flags ? Array.from(box.flags).map((f: string) => String(f)) : [],
    }));
  } finally {
    lock.release();
  }
}

export async function getFolderStatus(
  account: EmailAccount,
  folderPath: string
): Promise<{ total: number; unseen: number }> {
  const client = await getImapConnection(account);
  const status = await client.status(folderPath, {
    messages: true,
    unseen: true,
  });
  return {
    total: status.messages || 0,
    unseen: status.unseen || 0,
  };
}

// ─── Email Fetching ──────────────────────────────────────────────
export interface EmailMessage {
  uid: number;
  messageId?: string;
  threadId?: string;
  subject?: string;
  from: { address: string; name: string };
  to: Array<{ address: string; name: string }>;
  cc: Array<{ address: string; name: string }>;
  bcc: Array<{ address: string; name: string }>;
  replyTo?: string;
  date?: Date;
  bodyText?: string;
  bodyHtml?: string;
  snippet?: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  headers: Record<string, string>;
}

/**
 * Fetch emails for the LIST view (fast — envelope + flags only, NO body download).
 * This is 10-50x faster than fetching full source for every message.
 */
export async function fetchEmails(
  account: EmailAccount,
  folderPath: string,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    since?: Date;
  } = {}
): Promise<EmailMessage[]> {
  const client = await getImapConnection(account);
  const lock = await client.getMailboxLock(folderPath);

  try {
    const { limit = 50, offset = 0, search, since } = options;

    // Search with {uid: true} so results are UIDs not sequence numbers
    let uids: number[] = [];
    if (search) {
      const result = await client.search(
        {
          or: [
            { header: { subject: search } },
            { from: search },
            { to: search },
          ],
        },
        { uid: true }
      );
      uids = result === false ? [] : result;
    } else if (since) {
      const result = await client.search({ since }, { uid: true });
      uids = result === false ? [] : result;
    } else {
      const result = await client.search({ all: true }, { uid: true });
      uids = result === false ? [] : result;
    }

    // Sort descending (newest first — higher UIDs are newer)
    uids.sort((a, b) => b - a);

    // Apply pagination
    const paginatedUids = uids.slice(offset, offset + limit);

    if (paginatedUids.length === 0) {
      return [];
    }

    const messages: EmailMessage[] = [];

    // CRITICAL: The 3rd parameter MUST be {uid: true} to issue UID FETCH
    // instead of FETCH. Without it, ImapFlow treats paginatedUids as
    // sequence numbers, causing wrong emails to load.
    //
    // For the list view, we only fetch envelope + flags (NO source/body).
    // This makes the list load 10-50x faster.
    for await (const msg of client.fetch(
      paginatedUids,
      {
        flags: true,
        envelope: true,
      },
      { uid: true }  // ← THIS is what makes it UID FETCH
    )) {
      const parsed = parseEnvelopeMessage(msg as FetchResult);
      if (parsed) {
        messages.push(parsed);
      }
    }

    // Sort messages by date descending (server may return in any order)
    messages.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return messages;
  } finally {
    lock.release();
  }
}

/**
 * Fetch a SINGLE email by UID (full source for body content).
 * Only called when user clicks on an email.
 */
export async function fetchEmailByUid(
  account: EmailAccount,
  folderPath: string,
  uid: number
): Promise<EmailMessage | null> {
  const client = await getImapConnection(account);
  const lock = await client.getMailboxLock(folderPath);

  try {
    let result: EmailMessage | null = null;

    // CRITICAL: 3rd param {uid: true} makes this UID FETCH
    for await (const msg of client.fetch(
      String(uid),
      {
        flags: true,
        envelope: true,
        source: true,
      },
      { uid: true }  // ← Treat the range as UID, not sequence number
    )) {
      result = await parseFullMessage(msg as FetchResult);
    }

    return result;
  } finally {
    lock.release();
  }
}

// ─── Types for IMAP results ──────────────────────────────────────
interface FetchResult {
  uid: number;
  flags?: Set<string>;
  envelope?: {
    date?: Date;
    subject?: string;
    from?: Array<{ name?: string; address?: string }>;
    to?: Array<{ name?: string; address?: string }>;
    cc?: Array<{ name?: string; address?: string }>;
    bcc?: Array<{ name?: string; address?: string }>;
    replyTo?: Array<{ name?: string; address?: string }>;
    messageId?: string;
    inReplyTo?: string;
  };
  source?: Buffer;
}

// ─── Message Parsing (Envelope only — fast, for list view) ───────
function parseEnvelopeMessage(msg: FetchResult): EmailMessage | null {
  try {
    const env = msg.envelope;
    if (!env) return null;

    const subject = env.subject || "(No Subject)";
    const messageId = env.messageId;
    const date = env.date;

    const from = env.from?.[0]
      ? { name: env.from[0].name || "", address: env.from[0].address || "" }
      : { name: "", address: "" };

    const to = (env.to || []).map((a) => ({
      name: a.name || "",
      address: a.address || "",
    }));
    const cc = (env.cc || []).map((a) => ({
      name: a.name || "",
      address: a.address || "",
    }));
    const bcc = (env.bcc || []).map((a) => ({
      name: a.name || "",
      address: a.address || "",
    }));
    const replyTo = env.replyTo?.[0]?.address;

    const flags = msg.flags || new Set<string>();

    // Use subject as snippet for list view (no body downloaded)
    const snippet = subject !== "(No Subject)" ? subject : "";

    return {
      uid: msg.uid,
      messageId,
      subject,
      from,
      to,
      cc,
      bcc,
      replyTo,
      date,
      // No body for list view — only loaded when email is opened
      bodyText: undefined,
      bodyHtml: undefined,
      snippet,
      isRead: flags.has("\\Seen"),
      isStarred: flags.has("\\Flagged"),
      labels: extractLabels(flags),
      headers: {
        subject,
        from: from.name ? `${from.name} <${from.address}>` : from.address,
        "message-id": messageId || "",
      },
    };
  } catch (error) {
    console.error("[IMAP] Error parsing envelope:", error);
    return null;
  }
}

// ─── Message Parsing (Full source — for detail view) ─────────────
async function parseFullMessage(msg: FetchResult): Promise<EmailMessage | null> {
  try {
    let bodyText = "";
    let bodyHtml = "";
    let subject = "(No Subject)";
    let from: { address: string; name: string } = { address: "", name: "" };
    let to: Array<{ address: string; name: string }> = [];
    let cc: Array<{ address: string; name: string }> = [];
    let bcc: Array<{ address: string; name: string }> = [];
    let replyTo: string | undefined;
    let messageId: string | undefined;
    let date: Date | undefined;
    const headers: Record<string, string> = {};

    // Use envelope for structured header data
    if (msg.envelope) {
      subject = msg.envelope.subject || "(No Subject)";
      messageId = msg.envelope.messageId;
      date = msg.envelope.date;

      if (msg.envelope.from?.[0]) {
        from = {
          name: msg.envelope.from[0].name || "",
          address: msg.envelope.from[0].address || "",
        };
      }
      to = (msg.envelope.to || []).map((a) => ({
        name: a.name || "",
        address: a.address || "",
      }));
      cc = (msg.envelope.cc || []).map((a) => ({
        name: a.name || "",
        address: a.address || "",
      }));
      bcc = (msg.envelope.bcc || []).map((a) => ({
        name: a.name || "",
        address: a.address || "",
      }));
      if (msg.envelope.replyTo?.[0]) {
        replyTo = msg.envelope.replyTo[0].address;
      }

      headers["subject"] = subject;
      headers["from"] = from.name ? `${from.name} <${from.address}>` : from.address;
      headers["message-id"] = messageId || "";
    }

    // Parse full source with mailparser for body content
    if (msg.source) {
      try {
        const parsed = await simpleParser(msg.source);
        bodyText = parsed.text || "";
        bodyHtml = typeof parsed.html === "string" ? parsed.html : "";

        // Fall back to parsed headers if envelope wasn't available
        if (!msg.envelope) {
          subject = parsed.subject || "(No Subject)";
          messageId = parsed.messageId;
          date = parsed.date;

          if (parsed.from?.value?.[0]) {
            from = {
              name: parsed.from.value[0].name || "",
              address: parsed.from.value[0].address || "",
            };
          }
          const toAddrs = parsed.to
            ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).flatMap((a) => a.value)
            : [];
          to = toAddrs.map((a) => ({ name: a.name || "", address: a.address || "" }));

          const ccAddrs = parsed.cc
            ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]).flatMap((a) => a.value)
            : [];
          cc = ccAddrs.map((a) => ({ name: a.name || "", address: a.address || "" }));
        }
      } catch (parseErr) {
        console.warn("[IMAP] mailparser error:", parseErr);
      }
    }

    // Generate snippet from text body
    const snippet = bodyText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);

    const flags = msg.flags || new Set<string>();

    return {
      uid: msg.uid,
      messageId,
      subject,
      from,
      to,
      cc,
      bcc,
      replyTo,
      date,
      bodyText: bodyText || undefined,
      bodyHtml: bodyHtml || undefined,
      snippet,
      isRead: flags.has("\\Seen"),
      isStarred: flags.has("\\Flagged"),
      labels: extractLabels(flags),
      headers,
    };
  } catch (error) {
    console.error("[IMAP] Error parsing message:", error);
    return null;
  }
}

// ─── Email Actions ───────────────────────────────────────────────
export async function markAsRead(
  account: EmailAccount,
  folderPath: string,
  uid: number
): Promise<void> {
  const client = await getImapConnection(account);
  const lock = await client.getMailboxLock(folderPath);
  try {
    await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
  } finally {
    lock.release();
  }
}

export async function markAsUnread(
  account: EmailAccount,
  folderPath: string,
  uid: number
): Promise<void> {
  const client = await getImapConnection(account);
  const lock = await client.getMailboxLock(folderPath);
  try {
    await client.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true });
  } finally {
    lock.release();
  }
}

export async function toggleStar(
  account: EmailAccount,
  folderPath: string,
  uid: number,
  star: boolean
): Promise<void> {
  const client = await getImapConnection(account);
  const lock = await client.getMailboxLock(folderPath);
  try {
    if (star) {
      await client.messageFlagsAdd(String(uid), ["\\Flagged"], { uid: true });
    } else {
      await client.messageFlagsRemove(String(uid), ["\\Flagged"], { uid: true });
    }
  } finally {
    lock.release();
  }
}

export async function moveEmail(
  account: EmailAccount,
  fromFolder: string,
  uid: number,
  toFolder: string
): Promise<void> {
  const client = await getImapConnection(account);
  const lock = await client.getMailboxLock(fromFolder);
  try {
    await client.messageMove(String(uid), toFolder, { uid: true });
  } finally {
    lock.release();
  }
}

export async function deleteEmail(
  account: EmailAccount,
  folderPath: string,
  uid: number
): Promise<void> {
  const client = await getImapConnection(account);
  const lock = await client.getMailboxLock(folderPath);
  try {
    // Try to move to Trash first
    try {
      await client.messageMove(String(uid), "[Gmail]/Trash", { uid: true });
    } catch {
      // Fallback: add Deleted flag
      await client.messageFlagsAdd(String(uid), ["\\Deleted"], { uid: true });
    }
  } finally {
    lock.release();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
function extractLabels(flags: Set<string>): string[] {
  const labels: string[] = [];
  for (const flag of flags) {
    if (flag.startsWith("\\")) continue;
    labels.push(flag);
  }
  return labels;
}

// ─── Cleanup ─────────────────────────────────────────────────────
export async function closeAllConnections(): Promise<void> {
  for (const [, { client }] of connections) {
    try {
      await client.logout();
    } catch {
      // Ignore
    }
  }
  connections.clear();
}
