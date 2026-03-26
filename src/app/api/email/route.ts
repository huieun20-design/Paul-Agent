import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/api-helpers";

// GET /api/email — List emails
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const userId = user.id;
  const searchParams = request.nextUrl.searchParams;
  const folder = searchParams.get("folder") || "INBOX";
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const accountId = searchParams.get("accountId") || "";

  const emailAccounts = await prisma.emailAccount.findMany({
    where: { userId },
    select: { id: true },
  });

  const accountIds = accountId
    ? [accountId]
    : emailAccounts.map((a) => a.id);

  const where = {
    emailAccountId: { in: accountIds },
    folder: folder as "INBOX" | "SENT" | "DRAFTS" | "TRASH" | "SPAM",
    isDeleted: false,
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" as const } },
        { from: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(category && { category }),
  };

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
        emailAccount: { select: { id: true, email: true, provider: true } },
      },
    }),
    prisma.email.count({ where }),
  ]);

  return NextResponse.json({
    emails,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
