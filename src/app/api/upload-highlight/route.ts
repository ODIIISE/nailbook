import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `highlights/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("highlights")
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from("highlights").getPublicUrl(path);
    return NextResponse.json({ url: data?.publicUrl || null });
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
