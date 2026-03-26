import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/email/[id]/attachment?attachmentId=xxx&messageId=yyy
// Downloads attachment from Gmail API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachmentId = request.nextUrl.searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json({ error: "attachmentId required" }, { status: 400 });
  }

  // Get email and its account
  const email = await prisma.email.findUnique({
    where: { id },
    include: { emailAccount: true },
  });

  if (!email || !email.emailAccount.accessToken) {
    return NextResponse.json({ error: "Email or token not found" }, { status: 404 });
  }

  // Refresh token if needed
  let accessToken = email.emailAccount.accessToken;
  if (email.emailAccount.tokenExpiry && email.emailAccount.tokenExpiry < new Date()) {
    if (email.emailAccount.refreshToken) {
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: email.emailAccount.refreshToken,
            grant_type: "refresh_token",
          }),
        });
        const tokens = await tokenRes.json();
        if (tokens.access_token) {
          accessToken = tokens.access_token;
          await prisma.emailAccount.update({
            where: { id: email.emailAccountId },
            data: { accessToken: tokens.access_token, tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000) },
          });
        }
      } catch { /* use existing token */ }
    }
  }

  // Fetch attachment from Gmail API
  const gmailRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!gmailRes.ok) {
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: gmailRes.status });
  }

  const data = await gmailRes.json();

  // Gmail returns base64url encoded data
  const base64 = data.data.replace(/-/g, "+").replace(/_/g, "/");
  const buffer = Buffer.from(base64, "base64");

  // Find attachment info
  const att = await prisma.attachment.findFirst({
    where: { emailId: id, url: attachmentId },
  });

  const mimeType = att?.mimeType || "application/octet-stream";
  const filename = att?.filename || "attachment";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
