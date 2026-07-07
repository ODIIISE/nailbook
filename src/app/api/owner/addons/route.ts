import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "لطفاً دوباره وارد شوید" }, { status: 401 });
    }

    const { addons } = await request.json();

    if (!Array.isArray(addons)) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    // Validate fields
    for (const a of addons) {
      if (!a.name || typeof a.name !== "string") {
        return NextResponse.json({ error: "نام آپشن الزامی است" }, { status: 400 });
      }
      if (typeof a.price !== "number" || a.price < 0) {
        return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 });
      }
      if (typeof a.duration_minutes !== "number" || a.duration_minutes < 0) {
        return NextResponse.json({ error: "مدت زمان نامعتبر است" }, { status: 400 });
      }
    }

    const incomingIds = new Set(addons.map((a) => a.id));

    // Fetch current addon IDs to find which ones were deleted
    const { data: currentAddons, error: fetchErr } = await supabaseAdmin
      .from("addons")
      .select("id");

    if (fetchErr) {
      return NextResponse.json({ error: "خطا در خواندن آپشن‌ها: " + fetchErr.message }, { status: 500 });
    }

    const currentIds = new Set((currentAddons || []).map((a) => a.id));
    const deletedIds = [...currentIds].filter((id) => !incomingIds.has(id));

    // Delete removed addons
    if (deletedIds.length > 0) {
      // Also clean up addon_ids references in services
      const { data: services } = await supabaseAdmin.from("services").select("id, addon_ids");
      if (services) {
        for (const svc of services) {
          const currentAddonIds: string[] = svc.addon_ids || [];
          const cleanedIds = currentAddonIds.filter((aid: string) => !deletedIds.includes(aid));
          if (cleanedIds.length !== currentAddonIds.length) {
            await supabaseAdmin.from("services").update({ addon_ids: cleanedIds }).eq("id", svc.id);
          }
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from("addons")
        .delete()
        .in("id", deletedIds);

      if (deleteError) {
        return NextResponse.json({ error: "خطا در حذف آپشن: " + deleteError.message }, { status: 500 });
      }
    }

    // Upsert all addons (insert new + update existing)
    if (addons.length > 0) {
      const { error } = await supabaseAdmin
        .from("addons")
        .upsert(
          addons.map((a, i) => ({
            id: a.id,
            name: a.name,
            price: a.price,
            duration_minutes: a.duration_minutes,
            is_active: a.is_active !== false,
            sort_order: a.sort_order || i + 1,
          })),
          { onConflict: "id" }
        );

      if (error) {
        return NextResponse.json({ error: "خطا در ذخیره آپشن: " + error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "خطای سرور: " + String(error) }, { status: 500 });
  }
}
