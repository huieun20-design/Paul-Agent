import { NextResponse } from "next/server";
import { getAuthUser, getUserCompanyId, unauthorized, badRequest } from "@/lib/api-helpers";
import { executeEmailActions } from "@/lib/ai/action-executor";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const companyId = await getUserCompanyId(user.id);
  if (!companyId) return badRequest("No company found");

  const { id } = await params;
  const { actions } = await request.json();

  if (!actions?.length) return badRequest("No actions provided");

  const results = await executeEmailActions(id, user.id, companyId, actions);

  return NextResponse.json({ results });
}
