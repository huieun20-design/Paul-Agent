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

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      vendor: true,
      customer: true,
      invoices: true,
      claims: true,
      sourceEmail: { select: { id: true, subject: true, from: true, date: true } },
    },
  });

  if (!order) return notFound("Order not found");
  return NextResponse.json(order);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json();

  const order = await prisma.order.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.trackingNumber !== undefined && { trackingNumber: body.trackingNumber }),
      ...(body.totalAmount !== undefined && { totalAmount: parseFloat(body.totalAmount) }),
      ...(body.expectedDate && { expectedDate: new Date(body.expectedDate) }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.items && { items: body.items }),
    },
  });

  return NextResponse.json(order);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
