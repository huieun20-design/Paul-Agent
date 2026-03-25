import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, ClaimStatus } from "@/generated/prisma/client";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const memberships = await prisma.companyMember.findMany({
    where: { userId: user.id },
    select: { companyId: true },
  });
  const companyIds = memberships.map((m) => m.companyId);
  if (companyIds.length === 0) return NextResponse.json({ invoices: [], claims: [], summary: {} });

  const sp = request.nextUrl.searchParams;
  const companyId = sp.get("companyId") || "";
  const ids = companyId ? [companyId] : companyIds;

  const invoiceStatus = sp.get("invoiceStatus") || "";
  const claimStatus = sp.get("claimStatus") || "";

  const [invoices, claims] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId: { in: ids },
        ...(invoiceStatus && { status: invoiceStatus as InvoiceStatus }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        company: { select: { id: true, name: true } },
        vendor: { select: { id: true, companyName: true } },
        customer: { select: { id: true, companyName: true } },
        payments: { select: { id: true, amount: true, date: true } },
      },
    }),
    prisma.claim.findMany({
      where: {
        companyId: { in: ids },
        ...(claimStatus && { status: claimStatus as ClaimStatus }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        company: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
        sourceEmail: { select: { id: true, subject: true, from: true } },
      },
    }),
  ]);

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const overdueCount = invoices.filter((i) => ["UNPAID", "PARTIAL"].includes(i.status) && i.dueDate && new Date(i.dueDate) < new Date()).length;
  const openClaims = claims.filter((c) => ["OPEN", "IN_PROGRESS"].includes(c.status)).length;

  return NextResponse.json({
    invoices,
    claims,
    summary: { totalInvoiced, totalPaid, outstanding: totalInvoiced - totalPaid, overdueCount, openClaims, totalClaims: claims.length },
  });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { action } = body;

  let companyId = body.companyId;
  if (!companyId) {
    const m = await prisma.companyMember.findFirst({ where: { userId: user.id } });
    if (!m) return badRequest("No company found");
    companyId = m.companyId;
  }

  if (action === "add-invoice") {
    const { type, invoiceNumber, amount, currency, dueDate, vendorId, customerId, notes } = body;
    if (!invoiceNumber || !type || !amount) return badRequest("invoiceNumber, type, amount required");

    const invoice = await prisma.invoice.create({
      data: {
        companyId, type, invoiceNumber,
        amount: parseFloat(amount),
        currency: currency || "USD",
        dueDate: dueDate ? new Date(dueDate) : null,
        vendorId: vendorId || null,
        customerId: customerId || null,
        notes: notes || null,
      },
    });
    return NextResponse.json(invoice);
  }

  if (action === "add-claim") {
    const { title, description, priority, orderId, sourceEmailId } = body;
    if (!title) return badRequest("title required");

    const claim = await prisma.claim.create({
      data: {
        companyId, title,
        description: description || null,
        priority: priority || "MEDIUM",
        orderId: orderId || null,
        sourceEmailId: sourceEmailId || null,
      },
    });
    return NextResponse.json(claim);
  }

  if (action === "update-invoice") {
    const { id, status, paidAmount, notes } = body;
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paidAmount !== undefined && { paidAmount: parseFloat(paidAmount) }),
        ...(notes !== undefined && { notes }),
      },
    });
    return NextResponse.json(invoice);
  }

  if (action === "update-claim") {
    const { id, status, priority, description } = body;
    const claim = await prisma.claim.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(description !== undefined && { description }),
      },
    });
    return NextResponse.json(claim);
  }

  return badRequest("Invalid action");
}
