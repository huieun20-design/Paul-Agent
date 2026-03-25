import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/generated/prisma/client";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return NextResponse.json({ orders: [], total: 0 });

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") || "";
  const status = sp.get("status") || "";
  const search = sp.get("search") || "";
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "50");

  const where = {
    companyId,
    ...(type && { type: type as "VENDOR" | "CUSTOMER" }),
    ...(status && { status: status as OrderStatus }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" as const } },
        { vendor: { companyName: { contains: search, mode: "insensitive" as const } } },
        { customer: { companyName: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vendor: { select: { id: true, companyName: true } },
        customer: { select: { id: true, companyName: true } },
        _count: { select: { invoices: true, claims: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const body = await request.json();
  const { type, orderNumber, vendorId, customerId, items, totalAmount, currency, expectedDate, notes } = body;

  if (!orderNumber || !type) return badRequest("orderNumber and type are required");

  const order = await prisma.order.create({
    data: {
      companyId,
      type,
      orderNumber,
      vendorId: vendorId || null,
      customerId: customerId || null,
      items: items || null,
      totalAmount: totalAmount ? parseFloat(totalAmount) : null,
      currency: currency || "USD",
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes: notes || null,
    },
    include: {
      vendor: { select: { id: true, companyName: true } },
      customer: { select: { id: true, companyName: true } },
    },
  });

  return NextResponse.json(order);
}
