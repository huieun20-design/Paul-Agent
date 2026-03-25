import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGmailEmails, syncGmailSentEmails } from "@/lib/email/gmail";

// POST /api/email/sync — Sync emails from provider
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { accountId, maxResults } = await request.json();

  const emailAccount = await prisma.emailAccount.findFirst({
    where: {
      id: accountId || undefined,
      userId,
    },
  });

  if (!emailAccount) {
    return NextResponse.json(
      { error: "No email account found" },
      { status: 404 }
    );
  }

  let synced = 0;

  if (emailAccount.provider === "GMAIL") {
    const inbox = await syncGmailEmails(emailAccount.id, maxResults || 50);
    const sent = await syncGmailSentEmails(emailAccount.id, maxResults || 50);
    synced = inbox + sent;
  } else {
    return NextResponse.json(
      { error: `Provider ${emailAccount.provider} not yet supported` },
      { status: 400 }
    );
  }

  return NextResponse.json({ synced, accountId: emailAccount.id });
}
