import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const showCompleted = sp.get("completed") === "true";
  const priority = sp.get("priority") || "";

  const todos = await prisma.todo.findMany({
    where: {
      userId: user.id,
      isCompleted: showCompleted ? undefined : false,
      ...(priority && { priority: priority as "HIGH" | "MEDIUM" | "LOW" }),
    },
    orderBy: [{ isCompleted: "asc" }, { priority: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      sourceEmail: { select: { id: true, subject: true, from: true } },
    },
  });

  return NextResponse.json(todos);
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { title, description, priority, dueDate, source, sourceEmailId } = body;

  if (!title) return badRequest("title is required");

  const todo = await prisma.todo.create({
    data: {
      userId: user.id,
      title,
      description: description || null,
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      source: source || "MANUAL",
      sourceEmailId: sourceEmailId || null,
    },
  });

  return NextResponse.json(todo);
}
