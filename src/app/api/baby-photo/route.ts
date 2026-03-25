import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAuthUser, unauthorized } from "@/lib/api-helpers";

const BUCKET = "photos";

// GET — list photos
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { data, error } = await getSupabase().storage
    .from(BUCKET)
    .list(user.id, { limit: 20, sortBy: { column: "created_at", order: "desc" } });

  if (error) return NextResponse.json([]);

  const photos = (data || [])
    .filter(f => f.name !== ".emptyFolderPlaceholder")
    .map(f => ({
      id: f.name,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${user.id}/${f.name}`,
    }));

  return NextResponse.json(photos);
}

// POST — upload photo
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  // Check count
  const { data: existing } = await getSupabase().storage.from(BUCKET).list(user.id);
  const count = (existing || []).filter(f => f.name !== ".emptyFolderPlaceholder").length;
  if (count >= 20) {
    return NextResponse.json({ error: "Maximum 20 photos" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${Date.now()}.${ext}`;
  const path = `${user.id}/${filename}`;

  const bytes = await file.arrayBuffer();

  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  return NextResponse.json({ id: filename, url });
}

// DELETE — remove photo
export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await getSupabase().storage.from(BUCKET).remove([`${user.id}/${id}`]);

  return NextResponse.json({ success: true });
}
