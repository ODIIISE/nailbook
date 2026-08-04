import { NextRequest, NextResponse } from "next/server";
import { incrementSessionVersion, verifyCustomerSession } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  const userId = verifyCustomerSession(request.cookies.get("session")?.value);
  if (userId) {
    const invalidated = await incrementSessionVersion(userId);
    if (!invalidated) {
      const response = NextResponse.json({ error: "خروج انجام شد؛ لغو نشست روی سرور موقتاً در دسترس نیست" }, { status: 503 });
      response.cookies.set("session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("owner_session", "", { maxAge: 0, path: "/" });
  return response;
}
