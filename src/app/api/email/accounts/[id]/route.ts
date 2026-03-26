import { getAuthUser } from "@/lib/api-helpers";
import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";

// DELETE /api/email/accounts/[id] — Disconnect email account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const _user = await getAuthUser();
  if (!_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = _user!.id;
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
