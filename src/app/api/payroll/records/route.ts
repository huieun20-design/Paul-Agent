import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return NextResponse.json([]);

  const records = await prisma.payroll.findMany({
    where: { companyId },
    orderBy: { paidAt: "desc" },
    take: 200,
    include: {
      employee: { select: { name: true, position: true } },
    },
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const { employeeId, amount, cashAmount, payrollAmount, hours, hourlyRate, currency, period } = await request.json();
  if (!employeeId || !period) return badRequest("employeeId and period required");

  const record = await prisma.payroll.create({
    data: {
      companyId,
      employeeId,
      amount: parseFloat(amount) || 0,
      cashAmount: parseFloat(cashAmount) || 0,
      payrollAmount: parseFloat(payrollAmount) || 0,
      hours: hours ? parseFloat(hours) : null,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      currency: currency || "USD",
      period,
    },
    include: { employee: { select: { name: true, position: true } } },
  });

  return NextResponse.json(record);
}
