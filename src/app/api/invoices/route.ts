import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@/generated/prisma/client";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return NextResponse.json({ invoices: [], total: 0 });

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") || "";
  const status = sp.get("status") || "";
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "50");

  const where = {
    companyId,
    ...(type && { type: type as "VENDOR" | "CUSTOMER" }),
    ...(status && { status: status as InvoiceStatus }),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vendor: { select: { id: true, companyName: true } },
        customer: { select: { id: true, companyName: true } },
        order: { select: { id: true, orderNumber: true } },
        payments: { select: { id: true, amount: true, date: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const body = await request.json();
  const { type, invoiceNumber, vendorId, customerId, orderId, amount, currency, dueDate, notes } = body;

  if (!invoiceNumber || !type || !amount) return badRequest("invoiceNumber, type, and amount are required");

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      type,
      invoiceNumber,
      vendorId: vendorId || null,
      customerId: customerId || null,
      orderId: orderId || null,
      amount: parseFloat(amount),
      currency: currency || "USD",
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
    },
  });

  return NextResponse.json(invoice);
}
