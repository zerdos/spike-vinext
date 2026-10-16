import { AuthSession, AuthUser } from "./types";

export const SESSION_COOKIE_NAME = "spike_session";
export const DEFAULT_SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
export const DEFAULT_SECRET = "spike-land-default-dev-secret-change-in-production-2026";

function base64UrlEncode(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getSecret(secret?: string): string {
  if (secret) return secret;
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.AUTH_SECRET ||
      process.env.JWT_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      DEFAULT_SECRET
    );
  }
  return DEFAULT_SECRET;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSessionToken(
  session: AuthSession,
  secret?: string
): Promise<string> {
  const key = await getHmacKey(getSecret(secret));
  const encoder = new TextEncoder();

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));

  const payload = {
    ...session,
    exp: session.expiresAt,
    iat: session.createdAt,
  };
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(dataToSign)
  );
  const encodedSignature = base64UrlEncode(signatureBuffer);

  return `${dataToSign}.${encodedSignature}`;
}

export async function verifySessionToken(
  token: string,
  secret?: string
): Promise<AuthSession | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  try {
    const key = await getHmacKey(getSecret(secret));
    const encoder = new TextEncoder();
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    const signatureBytes = base64UrlDecode(encodedSignature);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as ArrayBuffer,
      encoder.encode(dataToVerify)
    );

    if (!isValid) return null;

    const decoder = new TextDecoder();
    const payloadJson = decoder.decode(base64UrlDecode(encodedPayload));
    const payload = JSON.parse(payloadJson);

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) {
      return null; // Expired
    }

    if (!payload.user || !payload.user.id || !payload.user.email) {
      return null;
    }

    return {
      user: payload.user as AuthUser,
      expiresAt: payload.exp || payload.expiresAt,
      createdAt: payload.iat || payload.createdAt,
    };
  } catch {
    return null;
  }
}

export function createSessionCookie(
  token: string,
  maxAge: number = DEFAULT_SESSION_MAX_AGE,
  secure: boolean = true
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function createClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure`;
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index === -1) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) {
      cookies[key] = decodeURIComponent(value);
    }
  }

  return cookies;
}

export async function getSessionFromRequest(
  request: Request,
  secret?: string
): Promise<AuthSession | null> {
  // 1. Check Bearer Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const session = await verifySessionToken(token, secret);
    if (session) return session;
  }

  // 2. Check Cookie header
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    return await verifySessionToken(token, secret);
  }

  return null;
}
