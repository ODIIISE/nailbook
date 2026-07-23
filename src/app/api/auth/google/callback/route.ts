import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getUserInfo, isAllowedEmail, signGoogleSession } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/admin?error=access_denied", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin?error=no_code", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (tokens.error) {
      return NextResponse.redirect(new URL("/admin?error=token_exchange_failed", request.url));
    }

    const userInfo = await getUserInfo(tokens.access_token);
    if (!userInfo.email) {
      return NextResponse.redirect(new URL("/admin?error=no_email", request.url));
    }

    if (!isAllowedEmail(userInfo.email)) {
      return NextResponse.redirect(new URL("/admin?error=unauthorized", request.url));
    }

    // Create session
    const session = signGoogleSession(
      userInfo.email,
      userInfo.name || "",
      userInfo.picture || ""
    );

    // Redirect to admin panel with session cookie
    const response = NextResponse.redirect(new URL("/admin", request.url));
    response.cookies.set("google_session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Google auth callback error:", err);
    return NextResponse.redirect(new URL("/admin?error=server_error", request.url));
  }
}
