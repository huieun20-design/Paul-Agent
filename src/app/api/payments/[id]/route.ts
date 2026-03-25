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

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: true,
      bankAccount: true,
    },
  });

  if (!payment) return notFound("Payment not found");
  return NextResponse.json(payment);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return notFound("Payment not found");

  // Reverse bank account balance
  if (payment.bankAccountId) {
    const delta = payment.type === "INCOMING" ? -payment.amount : payment.amount;
    await prisma.bankAccount.update({
      where: { id: payment.bankAccountId },
      data: { balance: { increment: delta } },
    });
  }

  await prisma.payment.delete({ where: { id } });

  // Recalculate invoice paidAmount
  if (payment.invoiceId) {
    const remaining = await prisma.payment.findMany({
      where: { invoiceId: payment.invoiceId },
      select: { amount: true },
    });
    const totalPaid = remaining.reduce((sum, p) => sum + p.amount, 0);
    const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
    if (invoice) {
      const newStatus = totalPaid >= invoice.amount ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID";
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { paidAmount: totalPaid, status: newStatus },
      });
    }
  }

  return NextResponse.json({ success: true });
}
