import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BankAccountType } from "@/generated/prisma/client";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return NextResponse.json([]);

  const accounts = await prisma.bankAccount.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { transactions: true, payments: true } },
    },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const { name, type, bankName, accountNumber, balance, currency } = await request.json();
  if (!name || !type) return badRequest("name and type are required");

  const account = await prisma.bankAccount.create({
    data: {
      companyId,
      name,
      type: type as BankAccountType,
      bankName: bankName || null,
      accountNumber: accountNumber || null,
      balance: balance ? parseFloat(balance) : 0,
      currency: currency || "USD",
    },
  });

  return NextResponse.json(account);
}
