import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendGmailEmail } from "@/lib/email/gmail";

// POST /api/email/send — Send email
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { accountId, to, cc, bcc, subject, body, inReplyTo, references, threadId } =
    await request.json();

  if (!to?.length || !subject || !body) {
    return NextResponse.json(
      { error: "to, subject, and body are required" },
      { status: 400 }
    );
  }

  const emailAccount = await prisma.emailAccount.findFirst({
    where: { id: accountId || undefined, userId },
  });

  if (!emailAccount) {
    return NextResponse.json(
      { error: "No email account found" },
      { status: 404 }
    );
  }

  if (emailAccount.provider === "GMAIL") {
    const messageId = await sendGmailEmail(emailAccount.id, to, subject, body, {
      cc,
      bcc,
      inReplyTo,
      references,
      threadId,
    });

    return NextResponse.json({ messageId });
  }

  return NextResponse.json(
    { error: `Provider ${emailAccount.provider} not yet supported` },
    { status: 400 }
  );
}
