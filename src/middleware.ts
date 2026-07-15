import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECRET = process.env.OWNER_SESSION_SECRET;

async function verifySessionSignature(cookieValue: string): Promise<boolean> {
  if (!SECRET) return false;

  const parts = cookieValue.split(":");
  // Accept both 3-part (legacy) and 4-part (versioned) tokens
  if (parts.length !== 3 && parts.length !== 4) return false;

  const userId = parts[0];
  const timestamp = parts[1];
  const signature = parts[parts.length - 1]; // Last part is always signature

  // Build payload: for 3-part it's "userId:timestamp", for 4-part it's "userId:timestamp:version"
  const payloadParts = parts.slice(0, -1); // Everything except signature
  const payload = payloadParts.join(":");

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSig = Array.from(
      new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)))
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (signature.length !== expectedSig.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /owner/* pages (not /owner/login)
  if (pathname.startsWith("/owner") && pathname !== "/owner/login") {
    const session = request.cookies.get("owner_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/owner/login", request.url));
    }
    // Verify HMAC signature
    const valid = await verifySessionSignature(session);
    if (!valid) {
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
    // Verify HMAC signature for API routes too
    if (session && pathname !== "/api/owner-logout") {
      const valid = await verifySessionSignature(session);
      if (!valid) {
        return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
      }
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
