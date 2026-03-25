import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const { type, amount, description, date } = await request.json();

  if (!type || !amount) return badRequest("type and amount are required");

  const account = await prisma.bankAccount.findUnique({ where: { id } });
  if (!account) return badRequest("Account not found");

  const delta = type === "INCOMING" ? parseFloat(amount) : -parseFloat(amount);
  const newBalance = account.balance + delta;

  const [transaction] = await Promise.all([
    prisma.transaction.create({
      data: {
        bankAccountId: id,
        type,
        amount: parseFloat(amount),
        balance: newBalance,
        description: description || null,
        date: date ? new Date(date) : new Date(),
      },
    }),
    prisma.bankAccount.update({
      where: { id },
      data: { balance: newBalance },
    }),
  ]);

  return NextResponse.json(transaction);
}
