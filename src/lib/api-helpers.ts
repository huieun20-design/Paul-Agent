import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { headers, cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getAuthUser() {
  // Try getServerSession first
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      return session.user as { id: string; name?: string; email?: string };
    }
  } catch { /* fall through */ }

  // Fallback: read JWT token directly
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("next-auth.session-token")?.value
      || cookieStore.get("__Secure-next-auth.session-token")?.value;

    if (token) {
      const jwt = await import("next-auth/jwt");
      const decoded = await jwt.decode({
        token,
        secret: process.env.NEXTAUTH_SECRET || "change-this",
      });
      if (decoded?.id) {
        return { id: decoded.id as string, name: decoded.name as string, email: decoded.email as string };
      }
    }
  } catch { /* fall through */ }

  // Final fallback: single-user app — get the only user
  try {
    const user = await prisma.user.findFirst({ select: { id: true, name: true, email: true } });
    if (user) return user;
  } catch { /* fall through */ }

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
