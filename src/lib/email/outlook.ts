import { prisma } from "@/lib/prisma";
import { categorizeEmail } from "./categorizer";

const GRAPH_API = "https://graph.microsoft.com/v1.0/me";

async function refreshOutlookToken(emailAccountId: string): Promise<string> {
  const account = await prisma.emailAccount.findUniqueOrThrow({ where: { id: emailAccountId } });

  if (account.tokenExpiry && account.tokenExpiry > new Date() && account.accessToken) {
    return account.accessToken;
  }

  if (!account.refreshToken) throw new Error("No refresh token. Please re-authenticate.");

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);

  await prisma.emailAccount.update({
    where: { id: emailAccountId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || account.refreshToken,
      tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

async function graphFetch(emailAccountId: string, path: string): Promise<Response> {
  const token = await refreshOutlookToken(emailAccountId);
  return fetch(`${GRAPH_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function syncOutlookEmails(
  emailAccountId: string,
  maxResults: number = 100,
  customCategories?: Record<string, string[]>
): Promise<number> {
  const res = await graphFetch(emailAccountId, `/messages?$top=${maxResults}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,isRead,hasAttachments,parentFolderId`);
  const data = await res.json();

  if (!data.value) return 0;

  let synced = 0;
  for (const msg of data.value) {
    const existing = await prisma.email.findUnique({ where: { messageId: msg.id } });
    if (existing) continue;

    const from = msg.from?.emailAddress ? `${msg.from.emailAddress.name} <${msg.from.emailAddress.address}>` : "";
    const to = (msg.toRecipients || []).map((r: { emailAddress: { address: string } }) => r.emailAddress.address);
    const cc = (msg.ccRecipients || []).map((r: { emailAddress: { address: string } }) => r.emailAddress.address);
    const subject = msg.subject || "";
    const bodyText = msg.body?.contentType === "text" ? msg.body.content : null;
    const bodyHtml = msg.body?.contentType === "html" ? msg.body.content : null;
    const folder = msg.parentFolderId?.includes("SentItems") ? "SENT" : "INBOX";
    const category = categorizeEmail(subject, bodyText || bodyHtml || "", customCategories);

    try {
      await prisma.email.create({
        data: {
          emailAccountId,
          messageId: msg.id,
          from,
          to,
          cc,
          bcc: [],
          subject,
          bodyText,
          bodyHtml,
          date: new Date(msg.receivedDateTime),
          isRead: msg.isRead,
          folder: folder as "INBOX" | "SENT",
          category,
          hasAttachments: msg.hasAttachments,
        },
      });
      synced++;
    } catch { /* skip duplicate */ }
  }

  return synced;
}

export async function markOutlookEmailRead(emailAccountId: string, messageId: string, isRead: boolean): Promise<void> {
  const token = await refreshOutlookToken(emailAccountId);
  await fetch(`${GRAPH_API}/messages/${messageId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ isRead }),
  });
}
