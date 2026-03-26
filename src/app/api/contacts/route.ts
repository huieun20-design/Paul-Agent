import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return NextResponse.json({ contacts: [], total: 0 });

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") || "";
  const search = sp.get("search") || "";
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "50");

  const where = {
    companyId,
    ...(type && { type: type as "VENDOR" | "CUSTOMER" | "BOTH" }),
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: "insensitive" as const } },
        { contactName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { companyName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { vendorOrders: true, customerOrders: true, invoicesAsVendor: true, invoicesAsCustomer: true } },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const body = await request.json();
  const { type, companyName, contactName, email, phone, address, notes } = body;

  if (!companyName || !type) return badRequest("companyName and type are required");

  const contact = await prisma.contact.create({
    data: {
      companyId,
      type,
      companyName,
      contactName: contactName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(contact);
}
