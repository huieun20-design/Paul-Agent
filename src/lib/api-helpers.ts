import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Single-user app — NEVER return null, NEVER return 401
const FALLBACK_USER = {
  id: "cmn6h09kk000004l8p2u8i1b9",
  name: "Paul",
  email: "admin@paulagent.local",
};

export async function getAuthUser() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, name: true, email: true } });
    if (user) return user;
  } catch { /* DB connection failed — use hardcoded fallback */ }

  return FALLBACK_USER;
}

export async function getUserCompanyId(userId: string): Promise<string | null> {
  try {
    const membership = await prisma.companyMember.findFirst({
      where: { userId },
      select: { companyId: true },
    });
    return membership?.companyId || null;
  } catch {
    return null;
  }
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
