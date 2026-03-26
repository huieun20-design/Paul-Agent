import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-helpers";

// GET /api/email/contacts?q=search
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json([]);

  const q = request.nextUrl.searchParams.get("q") || "";

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const accountIds = accounts.map(a => a.id);
  if (accountIds.length === 0) return NextResponse.json([]);

  // Fetch recent emails — no Prisma filter on arrays
  const emails = await prisma.email.findMany({
    where: { emailAccountId: { in: accountIds } },
    select: { from: true, to: true, cc: true },
    take: 500,
    orderBy: { date: "desc" },
  });

  // Extract unique contacts
  const contactMap = new Map<string, { email: string; name: string }>();

  function parseContact(raw: string) {
    if (!raw) return;
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

  // Filter by query in JS
  let results = Array.from(contactMap.values());
  if (q && q.length >= 1) {
    const lower = q.toLowerCase();
    results = results.filter(c =>
      c.email.toLowerCase().includes(lower) ||
      c.name.toLowerCase().includes(lower)
    );
  }

  return NextResponse.json(results.slice(0, 20));
}
