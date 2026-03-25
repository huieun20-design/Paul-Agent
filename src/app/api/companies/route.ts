import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

// GET — list user's companies
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const memberships = await prisma.companyMember.findMany({
    where: { userId: user.id },
    include: { company: true },
  });

  return NextResponse.json(memberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    role: m.role,
  })));
}

// POST — create new company
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { name } = await request.json();
  if (!name) return badRequest("name is required");

  const company = await prisma.company.create({
    data: {
      name,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  return NextResponse.json({ id: company.id, name: company.name, role: "OWNER" });
}
