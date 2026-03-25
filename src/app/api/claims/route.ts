import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClaimStatus } from "@/generated/prisma/client";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return NextResponse.json({ claims: [], total: 0 });

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") || "";
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "50");

  const where = {
    companyId,
    ...(status && { status: status as ClaimStatus }),
  };

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        order: { select: { id: true, orderNumber: true } },
        sourceEmail: { select: { id: true, subject: true, from: true } },
      },
    }),
    prisma.claim.count({ where }),
  ]);

  return NextResponse.json({ claims, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const body = await request.json();
  const { title, description, orderId, priority, sourceEmailId } = body;

  if (!title) return badRequest("title is required");

  const claim = await prisma.claim.create({
    data: {
      companyId,
      title,
      description: description || null,
      orderId: orderId || null,
      priority: priority || "MEDIUM",
      sourceEmailId: sourceEmailId || null,
    },
  });

  return NextResponse.json(claim);
}
