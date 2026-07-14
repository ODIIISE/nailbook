import { NextRequest, NextResponse } from "next/server";
import { verifyOwner } from "@/lib/owner-auth";
import { fetchActivityLogs, getActivityCounts } from "@/lib/db/activity-log";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("type") || "all";

    const [logs, counts] = await Promise.all([
      fetchActivityLogs(eventType),
      getActivityCounts(),
    ]);

    return NextResponse.json({ logs, counts });
  } catch (error) {
    console.error("Fetch activity logs error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
