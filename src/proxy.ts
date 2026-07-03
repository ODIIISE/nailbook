import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/owner") && pathname !== "/owner/login") {
    const session = request.cookies.get("owner_session");
    if (!session || !session.value) {
      return NextResponse.redirect(new URL("/owner/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/owner/:path*"],
};
