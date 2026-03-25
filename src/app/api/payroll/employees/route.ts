import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return NextResponse.json([]);

  const employees = await prisma.employee.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { payrolls: true } },
      payrolls: { orderBy: { paidAt: "desc" }, take: 1, select: { paidAt: true, amount: true } },
    },
  });

  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const { name, position, salary, currency, startDate } = await request.json();
  if (!name || !salary) return badRequest("name and salary are required");

  const employee = await prisma.employee.create({
    data: {
      companyId,
      name,
      position: position || null,
      salary: parseFloat(salary),
      currency: currency || "USD",
      startDate: startDate ? new Date(startDate) : new Date(),
    },
  });

  return NextResponse.json(employee);
}
