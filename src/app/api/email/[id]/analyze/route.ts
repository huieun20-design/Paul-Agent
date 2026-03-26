import { getAuthUser } from "@/lib/api-helpers";
import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { analyzeEmail } from "@/lib/ai/email-analyzer";

// POST /api/email/[id]/analyze — AI analyze email
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const _user = await getAuthUser();
  if (!_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const email = await prisma.email.findUnique({ where: { id } });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const analysis = await analyzeEmail(
    email.subject,
    email.bodyText || email.bodyHtml || "",
    email.from
  );

  // Save analysis results
  const updated = await prisma.email.update({
    where: { id },
    data: {
      category: analysis.category,
      priority: analysis.priority,
      aiSummary: analysis.summary,
      extractedData: JSON.parse(JSON.stringify(analysis.extractedData)),
      suggestedActions: JSON.parse(JSON.stringify(analysis.suggestedActions)),
    },
  });

  return NextResponse.json({ email: updated, analysis });
}
