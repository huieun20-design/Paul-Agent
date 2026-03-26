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

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      vendor: true,
      customer: true,
      order: true,
      payments: true,
      sourceEmail: { select: { id: true, subject: true, from: true, date: true } },
    },
  });

  if (!invoice) return notFound("Invoice not found");
  return NextResponse.json(invoice);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
  if (body.paidAmount !== undefined) updateData.paidAmount = parseFloat(body.paidAmount);
  if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
  if (body.notes !== undefined) updateData.notes = body.notes;

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(invoice);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
