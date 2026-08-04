import { NextResponse } from "next/server";

// Google OAuth removed. Use OTP login instead.
// See docs/auth.md for the OTP flow.

export async function GET() {
  return new NextResponse("Google login has been removed.", { status: 410 });
}

export async function POST() {
  return new NextResponse("Google login has been removed.", { status: 410 });
}
