import crypto from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const ALLOWED_EMAIL = process.env.ADMIN_EMAIL || "mehrdad.rastadfar@gmail.com";

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getRedirectUri(): string {
  // Use the current host from headers or env
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nailbook-admin.vercel.app";
  return `${baseUrl}/api/auth/google/callback`;
}

export async function exchangeCodeForTokens(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  return response.json();
}

export async function getUserInfo(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.json();
}

export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase() === ALLOWED_EMAIL.toLowerCase();
}

// Session management
const SESSION_SECRET = process.env.GOOGLE_SESSION_SECRET || process.env.OWNER_SESSION_SECRET!;

export function signGoogleSession(email: string, name: string, picture: string): string {
  const payload = `${email}:${name}:${picture}:${Date.now()}`;
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifyGoogleSession(cookieValue: string | undefined): { email: string; name: string; picture: string } | null {
  if (!cookieValue) return null;

  const parts = cookieValue.split(":");
  if (parts.length !== 5) return null;

  const email = parts[0];
  const name = parts[1];
  const picture = parts[2];
  const timestamp = parts[3];
  const signature = parts[4];

  const payload = `${email}:${name}:${picture}:${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  const age = Date.now() - parseInt(timestamp);
  if (age > 7 * 24 * 60 * 60 * 1000) return null;

  if (!isAllowedEmail(email)) return null;

  return { email, name, picture };
}
