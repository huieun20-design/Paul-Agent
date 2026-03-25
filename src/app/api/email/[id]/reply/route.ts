import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReply } from "@/lib/ai/email-analyzer";

// POST /api/email/[id]/reply — Generate AI reply
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
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
