import { prisma } from "@/lib/prisma";
import { categorizeEmail } from "./categorizer";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    mimeType: string;
    body?: { data?: string; size: number };
    parts?: GmailPart[];
  };
  internalDate: string;
}

interface GmailPart {
  mimeType: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size: number; attachmentId?: string };
  parts?: GmailPart[];
}

// Refresh Google OAuth token
async function refreshAccessToken(emailAccountId: string): Promise<string> {
  const emailAccount = await prisma.emailAccount.findUniqueOrThrow({
    where: { id: emailAccountId },
  });

  // Check if token is still valid
  if (emailAccount.tokenExpiry && emailAccount.tokenExpiry > new Date() && emailAccount.accessToken) {
    return emailAccount.accessToken;
  }

  // Use refresh token from EmailAccount table
  if (!emailAccount.refreshToken) {
    // No refresh token — use existing access token even if expired (might still work briefly)
    if (emailAccount.accessToken) return emailAccount.accessToken;
    throw new Error("No token available. Please reconnect this account.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: emailAccount.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // Refresh failed — still return existing token (might work for a bit)
    if (emailAccount.accessToken) return emailAccount.accessToken;
    throw new Error(`Token refresh failed. Will retry on next sync.`);
  }

  const expiry = new Date(Date.now() + data.expires_in * 1000);

  await prisma.emailAccount.update({
    where: { id: emailAccountId },
    data: {
      accessToken: data.access_token,
      tokenExpiry: expiry,
    },
  });

  return data.access_token;
}

// Fetch from Gmail API with auto-refresh
async function gmailFetch(
  emailAccountId: string,
  path: string,
  options?: RequestInit
): Promise<Response> {
  const token = await refreshAccessToken(emailAccountId);

  const res = await fetch(`${GMAIL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `Gmail API error: ${res.status} ${error.error?.message || res.statusText}`
    );
  }

  return res;
}

// Parse email headers
function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

// Decode base64url content
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

// Extract body from Gmail message parts
function extractBody(payload: GmailMessage["payload"]): {
  text: string;
  html: string;
} {
  let text = "";
  let html = "";

  function processPart(part: GmailPart) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  }

  if (payload.body?.data) {
    if (payload.mimeType === "text/html") {
      html = decodeBase64Url(payload.body.data);
    } else {
      text = decodeBase64Url(payload.body.data);
    }
  }

  if (payload.parts) {
    payload.parts.forEach(processPart);
  }

  return { text, html };
}

// Extract CID mapping (Content-ID → attachmentId) for inline images
function extractCidMap(payload: GmailMessage["payload"]): Record<string, string> {
  const cidMap: Record<string, string> = {};

  function processPart(part: GmailPart) {
    if (part.headers && part.body?.attachmentId) {
      const cidHeader = part.headers.find(h => h.name.toLowerCase() === "content-id");
      if (cidHeader) {
        // Content-ID comes as <xxx> — strip angle brackets
        const cid = cidHeader.value.replace(/[<>]/g, "");
        cidMap[cid] = part.body.attachmentId;
      }
    }
    if (part.parts) part.parts.forEach(processPart);
  }

  if (payload.parts) payload.parts.forEach(processPart);
  return cidMap;
}

// Replace cid: references in HTML with actual Gmail attachment URLs
function replaceCidWithUrls(html: string, cidMap: Record<string, string>, messageId: string, accessToken: string): string {
  // For each cid:xxx in the HTML, we can't fetch inline during sync
  // Instead we'll store the mapping and resolve at display time via our API
  // Replace cid:xxx with our proxy endpoint
  let result = html;
  for (const [cid, attachmentId] of Object.entries(cidMap)) {
    // Replace both src="cid:xxx" patterns
    result = result.replace(
      new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
      `CID_PLACEHOLDER_${attachmentId}`
    );
  }
  return result;
}

// Extract attachments info
function extractAttachments(
  payload: GmailMessage["payload"]
): { filename: string; mimeType: string; size: number; attachmentId: string }[] {
  const attachments: { filename: string; mimeType: string; size: number; attachmentId: string }[] = [];

  function processPart(part: GmailPart) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  }

  if (payload.parts) {
    payload.parts.forEach(processPart);
  }

  return attachments;
}

// Parse email addresses from header (e.g., "Name <email@test.com>, other@test.com")
function parseEmailAddresses(header: string): string[] {
  if (!header) return [];
  return header.split(",").map((s) => s.trim()).filter(Boolean);
}

// Sync emails from Gmail
export async function syncGmailEmails(
  emailAccountId: string,
  maxResults: number = 500,
  customCategories?: Record<string, string[]>
): Promise<number> {
  // Get list of message IDs
  const listRes = await gmailFetch(
    emailAccountId,
    `/messages?maxResults=${maxResults}&labelIds=INBOX`
  );
  const listData = await listRes.json();

  if (!listData.messages || listData.messages.length === 0) {
    return 0;
  }

  let synced = 0;

  for (const msg of listData.messages) {
    // Skip if already synced
    const existing = await prisma.email.findUnique({
      where: { messageId: msg.id },
    });
    if (existing) continue;

    // Fetch full message
    const msgRes = await gmailFetch(
      emailAccountId,
      `/messages/${msg.id}?format=full`
    );
    const message: GmailMessage = await msgRes.json();

    const headers = message.payload.headers;
    const { text, html } = extractBody(message.payload);
    const cidMap = extractCidMap(message.payload);
    const processedHtml = html ? replaceCidWithUrls(html, cidMap, message.id, "") : html;
    const attachments = extractAttachments(message.payload);
    const isRead = !message.labelIds.includes("UNREAD");
    const folder = message.labelIds.includes("SENT") ? "SENT" : "INBOX";
    const subject = getHeader(headers, "Subject");
    const category = categorizeEmail(subject, text, customCategories);

    try {
      await prisma.email.create({
        data: {
          emailAccountId,
          messageId: message.id,
          threadId: message.threadId,
          from: getHeader(headers, "From"),
          to: parseEmailAddresses(getHeader(headers, "To")),
          cc: parseEmailAddresses(getHeader(headers, "Cc")),
          bcc: parseEmailAddresses(getHeader(headers, "Bcc")),
          subject,
          bodyText: text,
          bodyHtml: processedHtml,
          date: new Date(parseInt(message.internalDate)),
          isRead,
          folder: folder as "INBOX" | "SENT",
          category,
          hasAttachments: attachments.length > 0,
          attachments: {
            create: attachments.map((att) => ({
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
              url: att.attachmentId,
            })),
          },
        },
      });
      synced++;
    } catch {
      // Skip duplicate messageId
    }
  }

  return synced;
}

// Sync sent emails
export async function syncGmailSentEmails(
  emailAccountId: string,
  maxResults: number = 500,
  customCategories?: Record<string, string[]>
): Promise<number> {
  const listRes = await gmailFetch(
    emailAccountId,
    `/messages?maxResults=${maxResults}&labelIds=SENT`
  );
  const listData = await listRes.json();

  if (!listData.messages || listData.messages.length === 0) {
    return 0;
  }

  let synced = 0;

  for (const msg of listData.messages) {
    const existing = await prisma.email.findUnique({
      where: { messageId: msg.id },
    });
    if (existing) continue;

    const msgRes = await gmailFetch(
      emailAccountId,
      `/messages/${msg.id}?format=full`
    );
    const message: GmailMessage = await msgRes.json();

    const headers = message.payload.headers;
    const { text, html } = extractBody(message.payload);
    const cidMap = extractCidMap(message.payload);
    const processedHtml = html ? replaceCidWithUrls(html, cidMap, message.id, "") : html;
    const attachments = extractAttachments(message.payload);
    const subject = getHeader(headers, "Subject");
    const category = categorizeEmail(subject, text, customCategories);

    try {
      await prisma.email.create({
        data: {
          emailAccountId,
          messageId: message.id,
          threadId: message.threadId,
          from: getHeader(headers, "From"),
          to: parseEmailAddresses(getHeader(headers, "To")),
          cc: parseEmailAddresses(getHeader(headers, "Cc")),
          bcc: [],
          subject,
          bodyText: text,
          bodyHtml: processedHtml,
          date: new Date(parseInt(message.internalDate)),
          isRead: true,
          folder: "SENT",
          category,
          hasAttachments: attachments.length > 0,
          attachments: {
            create: attachments.map((att) => ({
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
              url: att.attachmentId,
            })),
          },
        },
      });
      synced++;
    } catch {
      // Skip duplicate messageId
    }
  }

  return synced;
}

// Send email via Gmail
export async function sendGmailEmail(
  emailAccountId: string,
  to: string[],
  subject: string,
  body: string,
  options?: {
    cc?: string[];
    bcc?: string[];
    inReplyTo?: string;
    references?: string;
    threadId?: string;
  }
): Promise<string> {
  const emailAccount = await prisma.emailAccount.findUniqueOrThrow({
    where: { id: emailAccountId },
  });

  // Build MIME message
  const headers = [
    `From: ${emailAccount.email}`,
    `To: ${to.join(", ")}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
  ];

  if (options?.cc?.length) headers.push(`Cc: ${options.cc.join(", ")}`);
  if (options?.bcc?.length) headers.push(`Bcc: ${options.bcc.join(", ")}`);
  if (options?.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`);
  if (options?.references) headers.push(`References: ${options.references}`);

  const rawMessage = `${headers.join("\r\n")}\r\n\r\n${body}`;
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sendBody: { raw: string; threadId?: string } = { raw: encodedMessage };
  if (options?.threadId) sendBody.threadId = options.threadId;

  const res = await gmailFetch(emailAccountId, "/messages/send", {
    method: "POST",
    body: JSON.stringify(sendBody),
  });

  const data = await res.json();
  return data.id;
}

// Mark email as read/unread in Gmail
export async function markGmailEmailRead(
  emailAccountId: string,
  messageId: string,
  isRead: boolean
): Promise<void> {
  await gmailFetch(emailAccountId, `/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({
      removeLabelIds: isRead ? ["UNREAD"] : [],
      addLabelIds: isRead ? [] : ["UNREAD"],
    }),
  });

  await prisma.email.update({
    where: { messageId },
    data: { isRead },
  });
}

// Delete email (move to trash)
export async function trashGmailEmail(
  emailAccountId: string,
  messageId: string
): Promise<void> {
  await gmailFetch(emailAccountId, `/messages/${messageId}/trash`, {
    method: "POST",
  });

  await prisma.email.update({
    where: { messageId },
    data: { isDeleted: true, folder: "TRASH" },
  });
}
