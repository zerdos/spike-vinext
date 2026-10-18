export interface GoogleTokens {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  name: string;
  picture?: string;
  role?: "admin" | "user";
  provider: "google" | "credentials" | "workos";
  providerAccountId: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: number; // Unix timestamp in seconds
  createdAt: number; // Unix timestamp in seconds
}

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
}

export interface AuthCallbackResult {
  user: AuthUser;
  session: AuthSession;
  sessionToken: string;
  returnTo?: string;
}

export interface SessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
  expiresAt?: number;
}
