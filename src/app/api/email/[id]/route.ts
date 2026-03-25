import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/email/[id] — Get single email
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
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

  // Mark as read
  if (!email.isRead) {
    await prisma.email.update({
      where: { id },
      data: { isRead: true },
    });
  }

  return NextResponse.json(email);
}

// DELETE /api/email/[id] — Delete email
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.email.update({
    where: { id },
    data: { isDeleted: true, folder: "TRASH" },
  });

  return NextResponse.json({ success: true });
}
