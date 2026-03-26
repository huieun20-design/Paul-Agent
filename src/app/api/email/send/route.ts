import { getAuthUser } from "@/lib/api-helpers";
import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";

// POST /api/email/send — Send email (supports attachments via FormData)
export async function POST(request: Request) {
  const _user = await getAuthUser();
  if (!_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = _user!.id;
  const contentType = request.headers.get("content-type") || "";

  let accountId: string, to: string[], cc: string[], bcc: string[], subject: string, body: string;
  let inReplyTo: string | undefined, threadId: string | undefined;
  let attachments: { filename: string; mimeType: string; data: string }[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    accountId = formData.get("accountId") as string;
    to = (formData.get("to") as string || "").split(",").map(s => s.trim()).filter(Boolean);
    cc = (formData.get("cc") as string || "").split(",").map(s => s.trim()).filter(Boolean);
    bcc = (formData.get("bcc") as string || "").split(",").map(s => s.trim()).filter(Boolean);
    subject = formData.get("subject") as string;
    body = formData.get("body") as string;
    inReplyTo = formData.get("inReplyTo") as string || undefined;
    threadId = formData.get("threadId") as string || undefined;

    // Process file attachments
    const files = formData.getAll("attachments") as File[];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      attachments.push({ filename: file.name, mimeType: file.type || "application/octet-stream", data: base64 });
    }
  } else {
    const json = await request.json();
    accountId = json.accountId;
    to = json.to || [];
    cc = json.cc || [];
    bcc = json.bcc || [];
    subject = json.subject;
    body = json.body;
    inReplyTo = json.inReplyTo;
    threadId = json.threadId;
  }

  if (!to?.length || !subject || !body) {
    return NextResponse.json({ error: "to, subject, and body required" }, { status: 400 });
  }

  const emailAccount = await prisma.emailAccount.findFirst({
    where: { id: accountId || undefined, userId },
  });

  if (!emailAccount || !emailAccount.accessToken) {
    return NextResponse.json({ error: "No email account found" }, { status: 404 });
  }

  // Refresh token if needed
  let accessToken = emailAccount.accessToken;
  if (emailAccount.tokenExpiry && emailAccount.tokenExpiry < new Date() && emailAccount.refreshToken) {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: emailAccount.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const tokens = await tokenRes.json();
      if (tokens.access_token) {
        accessToken = tokens.access_token;
        await prisma.emailAccount.update({
          where: { id: emailAccount.id },
          data: { accessToken, tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000) },
        });
      }
    } catch { /* use existing */ }
  }

  // Build MIME message
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${emailAccount.email}`,
    `To: ${to.join(", ")}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
  ];

  if (cc.length) headers.push(`Cc: ${cc.join(", ")}`);
  if (bcc.length) headers.push(`Bcc: ${bcc.join(", ")}`);
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);

  let rawMessage: string;

  if (attachments.length > 0) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    const parts = [
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "",
      body,
      ...attachments.flatMap(att => [
        `--${boundary}`,
        `Content-Type: ${att.mimeType}; name="${att.filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${att.filename}"`,
        "",
        att.data.match(/.{1,76}/g)?.join("\n") || att.data,
      ]),
      `--${boundary}--`,
    ];
    rawMessage = `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
  } else {
    headers.push('Content-Type: text/html; charset="UTF-8"');
    rawMessage = `${headers.join("\r\n")}\r\n\r\n${body}`;
  }

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sendBody: { raw: string; threadId?: string } = { raw: encodedMessage };
  if (threadId) sendBody.threadId = threadId;

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sendBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.error?.message || "Send failed" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ messageId: data.id });
}
