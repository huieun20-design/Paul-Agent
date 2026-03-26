import { getAuthUser } from "@/lib/api-helpers";
import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { generateReply } from "@/lib/ai/email-analyzer";

// POST /api/email/[id]/reply — Generate AI reply
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const _user = await getAuthUser();
  if (!_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { tone, instructions } = await request.json();

  const email = await prisma.email.findUnique({ where: { id } });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const reply = await generateReply(
    {
      from: email.from,
      subject: email.subject,
      body: email.bodyText || email.bodyHtml || "",
    },
    tone || "formal",
    instructions
  );

  return NextResponse.json({ reply });
}
