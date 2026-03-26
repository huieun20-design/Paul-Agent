import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// POST — Upload large attachment to Supabase Storage, return public URL
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Ensure attachments bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === "attachments")) {
    await supabase.storage.createBucket("attachments", { public: true });
  }

  const ext = file.name.split(".").pop() || "file";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${userId}/${filename}`;

  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${path}`;

  return NextResponse.json({ url, name: file.name, size: file.size });
}
