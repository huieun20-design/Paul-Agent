import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/api-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json();

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.position !== undefined && { position: body.position }),
      ...(body.salary !== undefined && { salary: parseFloat(body.salary) }),
      ...(body.payType && { payType: body.payType }),
      ...(body.cashAmount !== undefined && { cashAmount: body.cashAmount ? parseFloat(body.cashAmount) : null }),
      ...(body.payrollAmount !== undefined && { payrollAmount: body.payrollAmount ? parseFloat(body.payrollAmount) : null }),
      ...(body.wageType && { wageType: body.wageType }),
      ...(body.hourlyRate !== undefined && { hourlyRate: body.hourlyRate ? parseFloat(body.hourlyRate) : null }),
      ...(body.hoursPerWeek !== undefined && { hoursPerWeek: body.hoursPerWeek ? parseFloat(body.hoursPerWeek) : null }),
      ...(body.payFrequency && { payFrequency: body.payFrequency }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(employee);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  await prisma.employee.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
