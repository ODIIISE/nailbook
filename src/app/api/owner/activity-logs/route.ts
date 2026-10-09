import { NextRequest, NextResponse } from "next/server";
import { requireStaff, staffAuthError } from "@/lib/owner-auth";
import { fetchActivityLogs, getActivityCounts } from "@/lib/db/activity-log";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request, "logs.view");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("type") || "all";
    const before = searchParams.get("before") || undefined;
    const limit = Number(searchParams.get("limit")) || 200;

    const [logs, counts] = await Promise.all([
      fetchActivityLogs(eventType, before, limit),
      getActivityCounts(),
    ]);

    return NextResponse.json({ logs, counts });
  } catch (error) {
    console.error("Fetch activity logs error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
