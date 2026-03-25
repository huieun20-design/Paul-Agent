import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, email, password, companyName } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "User already exists" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "OWNER",
    },
  });

  // Create default company
  if (companyName) {
    await prisma.company.create({
      data: {
        name: companyName,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });
  }

  return NextResponse.json({ id: user.id, email: user.email });
}
