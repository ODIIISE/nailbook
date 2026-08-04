import { NextResponse } from "next/server";

// Google OAuth removed.

export async function POST() {
  return new NextResponse("Google login has been removed.", { status: 410 });
}
