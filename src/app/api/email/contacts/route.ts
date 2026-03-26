import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/email/contacts?q=search — Auto-complete contacts from email history
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json([]);
  }

  const userId = (session.user as { id: string }).id;
  const q = request.nextUrl.searchParams.get("q") || "";

  // Get user's email accounts
  const accounts = await prisma.emailAccount.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = accounts.map(a => a.id);

  if (accountIds.length === 0) return NextResponse.json([]);

  // Get unique email addresses from sent emails (to/cc) and received (from)
  const emails = await prisma.email.findMany({
    where: {
      emailAccountId: { in: accountIds },
      OR: q ? [
        { from: { contains: q, mode: "insensitive" } },
        { to: { hasSome: [q] } },
      ] : undefined,
    },
    select: { from: true, to: true, cc: true },
    take: 500,
    orderBy: { date: "desc" },
  });

  // Extract unique contacts
  const contactMap = new Map<string, { email: string; name: string }>();

  function parseContact(raw: string) {
    const match = raw.match(/^"?([^"<]*)"?\s*<?([^>]+@[^>]+)>?$/);
    if (match) {
      const name = match[1].trim();
      const email = match[2].trim().toLowerCase();
      if (!contactMap.has(email)) {
        contactMap.set(email, { email, name: name || email.split("@")[0] });
      }
    } else if (raw.includes("@")) {
      const email = raw.trim().toLowerCase();
      if (!contactMap.has(email)) {
        contactMap.set(email, { email, name: email.split("@")[0] });
      }
    }
  }

  for (const e of emails) {
    parseContact(e.from);
    e.to.forEach(parseContact);
    e.cc.forEach(parseContact);
  }

  // Filter by query
  let results = Array.from(contactMap.values());
  if (q) {
    const lower = q.toLowerCase();
    results = results.filter(c =>
      c.email.toLowerCase().includes(lower) ||
      c.name.toLowerCase().includes(lower)
    );
  }

  return NextResponse.json(results.slice(0, 20));
}
