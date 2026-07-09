import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verifyOwner } from "@/lib/owner-auth";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "فایل ارسال نشده" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `highlights/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(path, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
