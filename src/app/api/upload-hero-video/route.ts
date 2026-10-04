import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verifyOwner } from "@/lib/owner-auth";
import { resolveSalonId } from "@/lib/multi-tenant";
import { detectVideoType, videoExtensionFor } from "@/lib/upload-security";
import { logActivity } from "@/lib/db/activity-log";

/* A background clip is heavier than a photo but must still be a sane
 * download on a phone page — the owner's own file is ~7 MB, so the ceiling
 * leaves headroom without letting a feature-length film into the hero. */
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

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

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "حجم فایل بیشتر از ۲۵ مگابایت است" }, { status: 400 });
    }

    // Trust the container's magic bytes, not the client's declared type or
    // filename; namespace blobs per salon so tenants can't collide or read
    // each other's media by guessing paths.
    const buffer = await file.arrayBuffer();
    const sniffed = detectVideoType(buffer);
    if (!sniffed) {
      return NextResponse.json({ error: "محتوای فایل ویدیو معتبر نیست" }, { status: 400 });
    }

    const salonId = await resolveSalonId();
    const ext = videoExtensionFor(sniffed);
    const path = `hero-videos/${salonId ?? "shared"}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(path, file, {
      access: "public",
      contentType: sniffed,
    });

    logActivity({
      eventType: "hero_video_updated",
      entityType: "salon",
      description: `ویدیوی پس‌زمینه صفحه اصلی به‌روزرسانی شد`,
      metadata: { fileName: file.name, fileSize: file.size, type: sniffed },
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload hero video error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}