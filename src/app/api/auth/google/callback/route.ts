import { NextResponse } from "next/server";

// Google OAuth removed. Use OTP login instead.

export async function GET() {
  return new NextResponse("Google login has been removed.", { status: 410 });
}
