import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECRET = process.env.CUSTOMER_SESSION_SECRET;

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
    const sigValid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
    if (!sigValid) return false;

    // Check timestamp expiry (second part of payload is always the timestamp).
    // Reject malformed and future-issued tokens; otherwise NaN/negative ages
    // could bypass this check even when the signature is valid.
    const timestamp = Number(parts[1]);
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return false;
    const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 30 * 1000; // 30 days, matches session-config.ts
    const age = Date.now() - timestamp;
    if (age < 0 || age > SESSION_MAX_AGE_MS) return false;

    return true;
  } catch {
    return false;
  }
}

// CSRF protection for state-changing requests
function checkCsrf(request: NextRequest): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;

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

  const referer = request.headers.get("referer");
  if (referer && !origin) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host !== host) return false;
    } catch {
      return false;
    }
  }

  // A state-changing request carrying a browser session must prove it came
  // from this origin. Modern browsers send Origin/Referer for POST fetches;
  // accepting both headers as absent would leave cookie-authenticated routes
  // exposed to CSRF from older or privacy-stripped clients.
  const hasBrowserSession = Boolean(
    request.cookies.get("session")?.value || request.cookies.get("super_admin_session")?.value
  );
  if (hasBrowserSession && !origin && !referer) return false;

  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF protection for all state-changing API routes
  if (pathname.startsWith("/api/") && !checkCsrf(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 403 });
  }

  // Unified session cookie - same one for customer and owner.
  const session = request.cookies.get("session")?.value;

  // Protect /owner/* pages (not /owner/login)
  if (pathname.startsWith("/owner") && pathname !== "/owner/login") {
    if (!session) {
      return NextResponse.redirect(new URL("/owner/login", request.url));
    }
    const valid = await verifySessionSignature(session);
    if (!valid) {
      return NextResponse.redirect(new URL("/owner/login", request.url));
    }
  }

  // Protect owner-scoped APIs (salon config, image upload, owner logout, etc.).
  // The page-level or endpoint-level handler still does the roles[] DB check.
  const ownerApiPaths = [
    "/api/owner",
    "/api/update-salon",
    "/api/upload",
    "/api/manual-reserve",
  ];
  const isOwnerApi =
    ownerApiPaths.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname === "/api/owner-logout";
  if (isOwnerApi) {
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

  if (
    pathname.startsWith("/api/auth/") &&
    pathname !== "/api/auth/send-otp" &&
    pathname !== "/api/auth/verify-otp" &&
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
    "/api/manual-reserve",
    "/api/owner-logout",
    "/api/:path*",
  ],
};
