import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/email/accounts — List email accounts
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const accounts = await prisma.emailAccount.findMany({
    where: { userId },
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { provider, email, companyId, accessToken, refreshToken } =
    await request.json();

  const account = await prisma.emailAccount.create({
    data: {
      userId,
      provider,
      email,
      companyId: companyId || null,
      accessToken,
      refreshToken,
    },
  });

  return NextResponse.json(account);
}
