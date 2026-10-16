import {
  AuthCallbackResult,
  AuthSession,
  AuthUser,
  GoogleAuthConfig,
  GoogleTokens,
  GoogleUserInfo,
} from "./types";
import {
  DEFAULT_SESSION_MAX_AGE,
  signSessionToken,
} from "./session";

export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";
export const DEFAULT_GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleConfig(
  env?: Record<string, string | undefined>
): GoogleAuthConfig {
  const getEnv = (key: string): string | undefined => {
    if (env && env[key] !== undefined) return env[key];
    if (typeof process !== "undefined" && process.env) {
      return process.env[key];
    }
    return undefined;
  };

  const clientId = getEnv("GOOGLE_CLIENT_ID") || "mock-google-client-id";
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET") || "mock-google-client-secret";
  const appUrl =
    getEnv("NEXT_PUBLIC_APP_URL") ||
    getEnv("APP_URL") ||
    "https://spike.land";
  const redirectUri =
    getEnv("GOOGLE_REDIRECT_URI") ||
    `${appUrl.replace(/\/+$/, "")}/api/auth/callback/google`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    authEndpoint: GOOGLE_AUTH_ENDPOINT,
    tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
    userInfoEndpoint: GOOGLE_USERINFO_ENDPOINT,
  };
}

export interface CreateAuthUrlOptions {
  config?: Partial<GoogleAuthConfig>;
  state?: string;
  returnTo?: string;
  prompt?: string;
  loginHint?: string;
  accessType?: "offline" | "online";
  scope?: string | string[];
}

export function createGoogleAuthorizationUrl(
  options?: CreateAuthUrlOptions
): string {
  const config = { ...getGoogleConfig(), ...options?.config };
  const url = new URL(config.authEndpoint || GOOGLE_AUTH_ENDPOINT);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");

  const scopes = Array.isArray(options?.scope)
    ? options.scope.join(" ")
    : options?.scope || DEFAULT_GOOGLE_SCOPES.join(" ");
  url.searchParams.set("scope", scopes);

  // Encode state & returnTo
  let stateValue = options?.state;
  if (!stateValue && options?.returnTo) {
    stateValue = JSON.stringify({ returnTo: options.returnTo });
  } else if (stateValue && options?.returnTo && !stateValue.includes("returnTo")) {
    stateValue = JSON.stringify({ state: stateValue, returnTo: options.returnTo });
  }

  if (stateValue) {
    url.searchParams.set("state", stateValue);
  }

  if (options?.prompt) {
    url.searchParams.set("prompt", options.prompt);
  }

  if (options?.loginHint) {
    url.searchParams.set("login_hint", options.loginHint);
  }

  url.searchParams.set("access_type", options?.accessType || "offline");
  url.searchParams.set("include_granted_scopes", "true");

  return url.toString();
}

export function parseState(stateParam: string | null | undefined): {
  returnTo?: string;
  raw?: string;
} {
  if (!stateParam) return {};
  try {
    const parsed = JSON.parse(stateParam);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        returnTo: typeof parsed.returnTo === "string" ? parsed.returnTo : undefined,
        raw: stateParam,
      };
    }
  } catch {
    // If not JSON, check if it's a URL path (e.g. state=/create or state=/)
    if (stateParam.startsWith("/")) {
      return { returnTo: stateParam, raw: stateParam };
    }
  }
  return { raw: stateParam };
}

export async function exchangeGoogleCode(
  code: string,
  options?: {
    config?: Partial<GoogleAuthConfig>;
    fetchFn?: typeof fetch;
    redirectUri?: string;
  }
): Promise<GoogleTokens> {
  const config = { ...getGoogleConfig(), ...options?.config };
  const fetcher = options?.fetchFn || fetch;
  const redirectUri = options?.redirectUri || config.redirectUri;

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetcher(config.tokenEndpoint || GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok || data.error) {
    const errorMsg =
      (data.error_description as string) ||
      (data.error as string) ||
      `Token exchange failed with status ${response.status}`;
    throw new Error(`Google OAuth error: ${errorMsg}`);
  }

  return {
    access_token: data.access_token as string,
    expires_in: (data.expires_in as number) || 3600,
    token_type: (data.token_type as string) || "Bearer",
    scope: (data.scope as string) || "",
    id_token: data.id_token as string | undefined,
    refresh_token: data.refresh_token as string | undefined,
  };
}

export async function fetchGoogleUserInfo(
  accessToken: string,
  options?: {
    config?: Partial<GoogleAuthConfig>;
    fetchFn?: typeof fetch;
  }
): Promise<GoogleUserInfo> {
  const config = { ...getGoogleConfig(), ...options?.config };
  const fetcher = options?.fetchFn || fetch;

  const response = await fetcher(
    config.userInfoEndpoint || GOOGLE_USERINFO_ENDPOINT,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Google user profile: status ${response.status}`
    );
  }

  const data = (await response.json()) as GoogleUserInfo;
  if (!data || !data.sub || !data.email) {
    throw new Error("Invalid user profile returned by Google");
  }

  return data;
}

export function decodeGoogleIdToken(idToken: string): Partial<GoogleUserInfo> | null {
  if (!idToken || typeof idToken !== "string") return null;
  const parts = idToken.split(".");
  if (parts.length < 2) return null;

  try {
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr) as Partial<GoogleUserInfo>;
  } catch {
    return null;
  }
}

export function normalizeGoogleUser(info: GoogleUserInfo): AuthUser {
  const now = new Date().toISOString();
  const name =
    info.name ||
    [info.given_name, info.family_name].filter(Boolean).join(" ") ||
    info.email.split("@")[0];

  return {
    id: `google_${info.sub}`,
    email: info.email.toLowerCase(),
    name,
    picture: info.picture,
    provider: "google",
    providerAccountId: info.sub,
    emailVerified: Boolean(info.email_verified),
    createdAt: now,
    updatedAt: now,
  };
}

export interface ProcessGoogleCallbackParams {
  code?: string | null;
  error?: string | null;
  errorDescription?: string | null;
  state?: string | null;
  iss?: string | null;
  redirectUri?: string;
}

export async function processGoogleCallback(
  params: ProcessGoogleCallbackParams,
  options?: {
    config?: Partial<GoogleAuthConfig>;
    secret?: string;
    fetchFn?: typeof fetch;
    sessionMaxAge?: number;
  }
): Promise<AuthCallbackResult> {
  if (params.error) {
    const desc = params.errorDescription ? `: ${params.errorDescription}` : "";
    throw new Error(`Google authentication failed: ${params.error}${desc}`);
  }

  if (!params.code) {
    throw new Error("Missing authorization code from Google OAuth callback");
  }

  // 1. Exchange authorization code for tokens
  const tokens = await exchangeGoogleCode(params.code, {
    config: options?.config,
    fetchFn: options?.fetchFn,
    redirectUri: params.redirectUri,
  });

  // 2. Fetch user profile
  let userInfo: GoogleUserInfo;
  try {
    userInfo = await fetchGoogleUserInfo(tokens.access_token, {
      config: options?.config,
      fetchFn: options?.fetchFn,
    });
  } catch (err) {
    // Fallback: If userInfo request fails but id_token was returned, decode id_token
    if (tokens.id_token) {
      const decoded = decodeGoogleIdToken(tokens.id_token);
      if (decoded && decoded.sub && decoded.email) {
        userInfo = decoded as GoogleUserInfo;
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  // 3. Normalize into AuthUser
  const user = normalizeGoogleUser(userInfo);

  // 4. Create session
  const nowSeconds = Math.floor(Date.now() / 1000);
  const maxAge = options?.sessionMaxAge || DEFAULT_SESSION_MAX_AGE;
  const session: AuthSession = {
    user,
    createdAt: nowSeconds,
    expiresAt: nowSeconds + maxAge,
  };

  // 5. Sign token
  const sessionToken = await signSessionToken(session, options?.secret);

  // 6. Extract returnTo
  const parsedState = parseState(params.state);

  return {
    user,
    session,
    sessionToken,
    returnTo: parsedState.returnTo,
  };
}
