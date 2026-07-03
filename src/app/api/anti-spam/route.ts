import { NextRequest, NextResponse } from "next/server";
import { checkAntiSpam } from "@/lib/anti-spam";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "شماره موبایل الزامی است" }, { status: 400 });
    }

    const result = await checkAntiSpam(phone);

    if (!result.allowed) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error("Anti-spam check error:", error);
    return NextResponse.json({ allowed: true });
  }
}
