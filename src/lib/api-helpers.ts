import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Single-user app — always return the user, never fail auth
let cachedUserId: string | null = null;

export async function getAuthUser() {
  // Use cached userId if available
  if (cachedUserId) {
    return { id: cachedUserId, name: "Paul", email: "admin@paulagent.local" };
  }

  // Get user from DB (single user app)
  try {
    const user = await prisma.user.findFirst({ select: { id: true, name: true, email: true } });
    if (user) {
      cachedUserId = user.id;
      return user;
    }
  } catch { /* DB error */ }

  return null;
}

export async function getUserCompanyId(userId: string): Promise<string | null> {
  const membership = await prisma.companyMember.findFirst({
    where: { userId },
    select: { companyId: true },
  });
  return membership?.companyId || null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound(msg = "Not found") {
  return NextResponse.json({ error: msg }, { status: 404 });
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
