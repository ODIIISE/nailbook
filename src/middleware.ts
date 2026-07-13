import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /owner/* pages (not /owner/login)
  if (pathname.startsWith("/owner") && pathname !== "/owner/login") {
    const session = request.cookies.get("owner_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/owner/login", request.url));
    }
  }

  // Protect /api/owner/* and /api/update-salon, /api/upload-* endpoints
  if (
    pathname.startsWith("/api/owner") ||
    pathname === "/api/update-salon" ||
    pathname.startsWith("/api/upload") ||
    pathname === "/api/owner-logout"
  ) {
    const session = request.cookies.get("owner_session")?.value;
    if (!session && pathname !== "/api/owner-logout") {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/api/owner/:path*",
    "/api/update-salon",
    "/api/upload/:path*",
    "/api/owner-logout",
  ],
};
