import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/email/accounts/[id] — Disconnect email account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  // Verify ownership
  const account = await prisma.emailAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Delete all emails from this account first
  await prisma.email.deleteMany({ where: { emailAccountId: id } });

  // Delete the account
  await prisma.emailAccount.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
