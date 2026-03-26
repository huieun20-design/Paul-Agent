import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: {
      transactions: { orderBy: { date: "desc" }, take: 50 },
      payments: { orderBy: { date: "desc" }, take: 20, include: { invoice: { select: { invoiceNumber: true } } } },
    },
  });

  if (!account) return notFound("Account not found");
  return NextResponse.json(account);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json();

  const account = await prisma.bankAccount.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.bankName !== undefined && { bankName: body.bankName }),
      ...(body.balance !== undefined && { balance: parseFloat(body.balance) }),
    },
  });

  return NextResponse.json(account);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  await prisma.bankAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
