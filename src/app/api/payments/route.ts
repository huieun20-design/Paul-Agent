import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return NextResponse.json({ payments: [], total: 0 });

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") || "";
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "50");

  const where = {
    companyId,
    ...(type && { type: type as "INCOMING" | "OUTGOING" }),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, amount: true } },
        bankAccount: { select: { id: true, name: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return NextResponse.json({ payments, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const body = await request.json();
  const { type, amount, invoiceId, bankAccountId, currency, date, description, reference } = body;

  if (!type || !amount) return badRequest("type and amount are required");

  const payment = await prisma.payment.create({
    data: {
      companyId,
      type,
      amount: parseFloat(amount),
      invoiceId: invoiceId || null,
      bankAccountId: bankAccountId || null,
      currency: currency || "USD",
      date: date ? new Date(date) : new Date(),
      description: description || null,
      reference: reference || null,
    },
  });

  // Auto-update invoice paidAmount if linked
  if (invoiceId) {
    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      select: { amount: true },
    });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (invoice) {
      const newStatus = totalPaid >= invoice.amount ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID";
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: totalPaid, status: newStatus },
      });
    }
  }

  // Auto-update bank account balance
  if (bankAccountId) {
    const delta = type === "INCOMING" ? parseFloat(amount) : -parseFloat(amount);
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { increment: delta } },
    });
  }

  return NextResponse.json(payment);
}
