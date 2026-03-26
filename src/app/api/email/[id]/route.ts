import { getAuthUser } from "@/lib/api-helpers";
import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { markGmailEmailRead } from "@/lib/email/gmail";

// GET /api/email/[id] — Get single email
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const _user = await getAuthUser();
  if (!_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const email = await prisma.email.findUnique({
    where: { id },
    include: {
      attachments: true,
      emailAccount: { select: { id: true, email: true, provider: true } },
    },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Mark as read — sync to Gmail
  if (!email.isRead) {
    await prisma.email.update({
      where: { id },
      data: { isRead: true },
    });

    // Sync read status to Gmail (non-blocking)
    try {
      markGmailEmailRead(email.emailAccountId, email.messageId, true).catch(() => {});
    } catch { /* ignore */ }
  }

  return NextResponse.json(email);
}

// PATCH /api/email/[id] — Update email (category, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const _user = await getAuthUser();
  if (!_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // If marking as read/unread, sync to Gmail
  if (body.isRead !== undefined) {
    const emailData = await prisma.email.findUnique({ where: { id }, select: { messageId: true, emailAccountId: true } });
    if (emailData) {
      try {
        markGmailEmailRead(emailData.emailAccountId, emailData.messageId, body.isRead).catch(() => {});
      } catch { /* ignore */ }
    }
  }

  const email = await prisma.email.update({
    where: { id },
    data: {
      ...(body.category !== undefined && { category: body.category }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.isRead !== undefined && { isRead: body.isRead }),
    },
  });

  return NextResponse.json(email);
}

// DELETE /api/email/[id] — Delete email
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const _user = await getAuthUser();
  if (!_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.email.update({
    where: { id },
    data: { isDeleted: true, folder: "TRASH" },
  });

  return NextResponse.json({ success: true });
}
