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
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { payrolls: true } },
      payrolls: { orderBy: { paidAt: "desc" }, take: 1, select: { paidAt: true, amount: true, cashAmount: true, payrollAmount: true } },
    },
  });

  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const body = await request.json();
  const { name, position, salary, payType, cashAmount, payrollAmount, payFrequency, currency, notes } = body;
  if (!name) return badRequest("name is required");

  const employee = await prisma.employee.create({
    data: {
      companyId,
      name,
      position: position || null,
      salary: parseFloat(salary) || 0,
      payType: payType || "PAYROLL",
      cashAmount: cashAmount ? parseFloat(cashAmount) : null,
      payrollAmount: payrollAmount ? parseFloat(payrollAmount) : null,
      payFrequency: payFrequency || "MONTHLY",
      currency: currency || "USD",
      notes: notes || null,
    },
  });

  return NextResponse.json(employee);
}
