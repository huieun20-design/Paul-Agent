import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/api-helpers";

// Store photos as base64 in database (simple, no external storage needed)
// For production, use Supabase Storage or S3

// GET — list photos
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Use a simple key-value approach with the user's settings
  // Store photos in a dedicated table-like approach using Todo with special source
  // Actually, let's use a simpler approach - store in a JSON field

  const photos = await prisma.todo.findMany({
    where: { userId: user.id, source: "PHOTO" },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, description: true },
  });

  return NextResponse.json(photos.map(p => ({
    id: p.id,
    url: p.description, // base64 data URL stored here
    name: p.title,
  })));
}

// POST — upload photo (as base64)
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  // Check count
  const count = await prisma.todo.count({
    where: { userId: user.id, source: "PHOTO" },
  });
  if (count >= 20) {
    return NextResponse.json({ error: "Maximum 20 photos" }, { status: 400 });
  }

  // Convert to base64
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  // Store in DB
  const photo = await prisma.todo.create({
    data: {
      userId: user.id,
      title: file.name,
      description: dataUrl,
      source: "PHOTO",
      priority: "LOW",
    },
  });

  return NextResponse.json({ id: photo.id, url: dataUrl, name: file.name });
}

// DELETE — remove photo
export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.todo.delete({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
