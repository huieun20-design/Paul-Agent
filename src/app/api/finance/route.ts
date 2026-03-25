import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BankAccountType } from "@/generated/prisma/client";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

// GET /api/finance?companyId=xxx — Multi-company finance data
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const companyId = sp.get("companyId") || "";
  const type = sp.get("type") || "";

  // Get all user's companies
  const memberships = await prisma.companyMember.findMany({
    where: { userId: user.id },
    select: { companyId: true },
  });
  const companyIds = companyId
    ? [companyId]
    : memberships.map((m) => m.companyId);

  if (companyIds.length === 0) {
    return NextResponse.json({ accounts: [], payments: [], summary: {}, companies: [] });
  }

  const [accounts, payments, companies] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { companyId: { in: companyIds } },
      orderBy: { name: "asc" },
      include: {
        company: { select: { id: true, name: true } },
        transactions: { orderBy: { date: "desc" }, take: 30 },
        _count: { select: { transactions: true, payments: true } },
      },
    }),
    prisma.payment.findMany({
      where: {
        companyId: { in: companyIds },
        ...(type && { type: type as "INCOMING" | "OUTGOING" }),
      },
      orderBy: { date: "desc" },
      take: 100,
      include: {
        company: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true, amount: true } },
        bankAccount: { select: { id: true, name: true } },
      },
    }),
    prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: {
        id: true,
        name: true,
        _count: { select: { bankAccounts: true } },
      },
    }),
  ]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const incoming = payments.filter((p) => p.type === "INCOMING").reduce((s, p) => s + p.amount, 0);
  const outgoing = payments.filter((p) => p.type === "OUTGOING").reduce((s, p) => s + p.amount, 0);

  // Per-company summary
  const companyBalances = companies.map((c) => ({
    ...c,
    balance: accounts.filter((a) => a.companyId === c.id).reduce((s, a) => s + a.balance, 0),
    accountCount: accounts.filter((a) => a.companyId === c.id).length,
  }));

  return NextResponse.json({
    accounts,
    payments,
    companies: companyBalances,
    summary: { totalBalance, incoming, outgoing, net: incoming - outgoing },
  });
}

// POST /api/finance — Create account, payment, transaction
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { action, companyId } = body;

  if (!companyId) {
    // Try to get default company
    const membership = await prisma.companyMember.findFirst({ where: { userId: user.id } });
    if (!membership) return badRequest("No company found");
    body.companyId = membership.companyId;
  }

  if (action === "add-account") {
    const { name, type, bankName, accountNumber, balance, currency, creditLimit, dueDate, minimumPay, apr, statementDate } = body;
    if (!name || !type) return badRequest("name and type required");

    const account = await prisma.bankAccount.create({
      data: {
        companyId: body.companyId,
        name,
        type: type as BankAccountType,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        balance: balance ? parseFloat(balance) : 0,
        currency: currency || "USD",
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        dueDate: dueDate ? parseInt(dueDate) : null,
        minimumPay: minimumPay ? parseFloat(minimumPay) : null,
        apr: apr ? parseFloat(apr) : null,
        statementDate: statementDate ? parseInt(statementDate) : null,
      },
    });
    return NextResponse.json(account);
  }

  if (action === "update-account") {
    const { id, ...updates } = body;
    if (!id) return badRequest("id required");
    const data: Record<string, unknown> = {};
    if (updates.name) data.name = updates.name;
    if (updates.bankName !== undefined) data.bankName = updates.bankName;
    if (updates.creditLimit !== undefined) data.creditLimit = updates.creditLimit ? parseFloat(updates.creditLimit) : null;
    if (updates.dueDate !== undefined) data.dueDate = updates.dueDate ? parseInt(updates.dueDate) : null;
    if (updates.minimumPay !== undefined) data.minimumPay = updates.minimumPay ? parseFloat(updates.minimumPay) : null;
    if (updates.apr !== undefined) data.apr = updates.apr ? parseFloat(updates.apr) : null;
    if (updates.balance !== undefined) data.balance = parseFloat(updates.balance);
    const account = await prisma.bankAccount.update({ where: { id }, data });
    return NextResponse.json(account);
  }

  if (action === "add-payment") {
    const { type, amount, invoiceId, bankAccountId, currency, date, description, reference } = body;
    if (!type || !amount) return badRequest("type and amount required");

    const payment = await prisma.payment.create({
      data: {
        companyId: body.companyId,
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

    if (invoiceId) {
      const allPayments = await prisma.payment.findMany({ where: { invoiceId }, select: { amount: true } });
      const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { paidAmount: totalPaid, status: totalPaid >= invoice.amount ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID" },
        });
      }
    }

    if (bankAccountId) {
      const delta = type === "INCOMING" ? parseFloat(amount) : -parseFloat(amount);
      await prisma.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { increment: delta } } });
    }

    return NextResponse.json(payment);
  }

  if (action === "add-transaction") {
    const { bankAccountId, type, amount, description, date } = body;
    if (!bankAccountId || !type || !amount) return badRequest("bankAccountId, type, amount required");

    const account = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!account) return badRequest("Account not found");

    const delta = type === "INCOMING" ? parseFloat(amount) : -parseFloat(amount);
    const newBalance = account.balance + delta;

    const [transaction] = await Promise.all([
      prisma.transaction.create({
        data: { bankAccountId, type, amount: parseFloat(amount), balance: newBalance, description: description || null, date: date ? new Date(date) : new Date() },
      }),
      prisma.bankAccount.update({ where: { id: bankAccountId }, data: { balance: newBalance } }),
    ]);
    return NextResponse.json(transaction);
  }

  if (action === "add-company") {
    const { name } = body;
    if (!name) return badRequest("name required");
    const company = await prisma.company.create({
      data: { name, members: { create: { userId: user.id, role: "OWNER" } } },
    });
    return NextResponse.json(company);
  }

  return badRequest("Invalid action");
}
