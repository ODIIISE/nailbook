import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECRET = process.env.OWNER_SESSION_SECRET;

async function verifySessionSignature(cookieValue: string): Promise<boolean> {
  if (!SECRET || !cookieValue) return false;

  const parts = cookieValue.split(":");
  // Accept both 3-part (legacy) and 4-part (versioned) tokens
  if (parts.length !== 3 && parts.length !== 4) return false;

  const signature = parts[parts.length - 1]; // Last part is always signature
  if (!/^[a-f0-9]+$/.test(signature)) return false;

  // Build payload: for 3-part it's "userId:timestamp", for 4-part it's "userId:timestamp:version"
  const payloadParts = parts.slice(0, -1); // Everything except signature
  const payload = payloadParts.join(":");

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

// CSRF protection for state-changing requests
function checkCsrf(request: NextRequest): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;

  // Check Origin header
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) return false;
    } catch {
      return false;
    }
  }

  // Check Referer as fallback
  const referer = request.headers.get("referer");
  if (referer && !origin) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host !== host) return false;
    } catch {
      return false;
    }
  }

  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF protection for all state-changing API routes
  if (pathname.startsWith("/api/") && !checkCsrf(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 403 });
  }

  // Protect /owner/* pages (not /owner/login)
  if (pathname.startsWith("/owner") && pathname !== "/owner/login") {
    const session = request.cookies.get("owner_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/owner/login", request.url));
    }
    const valid = await verifySessionSignature(session);
    if (!valid) {
      return NextResponse.redirect(new URL("/owner/login", request.url));
    }
  }

  // Protect /api/owner/* and /api/update-salon, /api/upload-* endpoints
  // Exclude /api/owner-login (needs to be accessible without session)
  if (
    (pathname.startsWith("/api/owner") && pathname !== "/api/owner-login") ||
    pathname === "/api/update-salon" ||
    pathname.startsWith("/api/upload") ||
    pathname === "/api/owner-logout"
  ) {
    const session = request.cookies.get("owner_session")?.value;
    if (!session && pathname !== "/api/owner-logout") {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    if (session && pathname !== "/api/owner-logout") {
      const valid = await verifySessionSignature(session);
      if (!valid) {
        return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
      }
    }
  }

  // Protect customer auth mutation routes (not check-phone or auth/me)
  if (
    pathname.startsWith("/api/auth/") &&
    pathname !== "/api/auth/check-phone" &&
    pathname !== "/api/auth/me" &&
    request.method !== "GET"
  ) {
    if (!checkCsrf(request)) {
      return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 403 });
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
    "/api/:path*",
  ],
};
