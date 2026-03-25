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

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      vendorOrders: { orderBy: { createdAt: "desc" }, take: 10 },
      customerOrders: { orderBy: { createdAt: "desc" }, take: 10 },
      invoicesAsVendor: { orderBy: { createdAt: "desc" }, take: 10 },
      invoicesAsCustomer: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!contact) return notFound("Contact not found");
  return NextResponse.json(contact);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json();

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(body.type && { type: body.type }),
      ...(body.companyName && { companyName: body.companyName }),
      ...(body.contactName !== undefined && { contactName: body.contactName }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.vendorScore !== undefined && { vendorScore: parseFloat(body.vendorScore) }),
    },
  });

  return NextResponse.json(contact);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
