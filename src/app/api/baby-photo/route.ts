import { NextResponse } from "next/server";
import { writeFile, readdir, unlink } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public/uploads");

// GET — list uploaded photos
export async function GET() {
  try {
    const files = await readdir(UPLOAD_DIR);
    const photos = files
      .filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map((f) => `/uploads/${f}`);
    return NextResponse.json(photos);
  } catch {
    return NextResponse.json([]);
  }
}

// POST — upload photo
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `baby_${Date.now()}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  await writeFile(filepath, buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}

// DELETE — remove photo
export async function DELETE(request: Request) {
  const { url } = await request.json();
  const filename = url.split("/").pop();
  if (!filename) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  try {
    await unlink(join(UPLOAD_DIR, filename));
  } catch { /* ignore */ }

  return NextResponse.json({ success: true });
}
