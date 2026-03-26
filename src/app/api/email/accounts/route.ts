import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/api-helpers";

// GET /api/email/accounts — List email accounts
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      email: true,
      provider: true,
      companyId: true,
      createdAt: true,
      _count: { select: { emails: true } },
    },
  });

  return NextResponse.json(accounts);
}

// POST /api/email/accounts — Connect email account
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { provider, email, companyId, accessToken, refreshToken } =
    await request.json();

  const account = await prisma.emailAccount.create({
    data: {
      userId: user.id,
      provider,
      email,
      companyId: companyId || null,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
    },
  });

  return NextResponse.json(account);
}
