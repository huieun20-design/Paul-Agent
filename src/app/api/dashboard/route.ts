import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getUserCompanyId, unauthorized } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) {
    return NextResponse.json({
      pendingOrders: 0,
      unpaidInvoices: 0,
      overdueInvoices: 0,
      overdueAmount: 0,
      cashBalance: 0,
      openTodos: 0,
      urgentTodos: 0,
      openClaims: 0,
      recentEmails: 0,
      incomingPayments30d: 0,
      outgoingPayments30d: 0,
      monthlyPayroll: 0,
    });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    pendingOrders,
    unpaidInvoices,
    overdueInvoices,
    cashBalance,
    openTodos,
    urgentTodos,
    openClaims,
    recentEmails,
    incomingPayments,
    outgoingPayments,
    activeEmployees,
  ] = await Promise.all([
    prisma.order.count({ where: { companyId, status: "PENDING" } }),
    prisma.invoice.count({ where: { companyId, status: { in: ["UNPAID", "PARTIAL"] } } }),
    prisma.invoice.findMany({
      where: { companyId, status: { in: ["UNPAID", "PARTIAL"] }, dueDate: { lt: new Date() } },
      select: { amount: true, paidAmount: true },
    }),
    prisma.bankAccount.aggregate({ where: { companyId }, _sum: { balance: true } }),
    prisma.todo.count({ where: { userId: user.id, isCompleted: false } }),
    prisma.todo.count({ where: { userId: user.id, isCompleted: false, priority: "HIGH" } }),
    prisma.claim.count({ where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.email.count({
      where: {
        emailAccount: { userId: user.id },
        isRead: false,
        folder: "INBOX",
      },
    }),
    prisma.payment.aggregate({
      where: { companyId, type: "INCOMING", date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { companyId, type: "OUTGOING", date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: { salary: true },
    }),
  ]);

  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + (inv.amount - inv.paidAmount),
    0
  );
  const monthlyPayroll = activeEmployees.reduce((sum, e) => sum + e.salary, 0);

  return NextResponse.json({
    pendingOrders,
    unpaidInvoices,
    overdueInvoices: overdueInvoices.length,
    overdueAmount,
    cashBalance: cashBalance._sum.balance || 0,
    openTodos,
    urgentTodos,
    openClaims,
    recentEmails,
    incomingPayments30d: incomingPayments._sum.amount || 0,
    outgoingPayments30d: outgoingPayments._sum.amount || 0,
    monthlyPayroll,
  });
}
