"use client";

export const BEARER_TOKEN_STORAGE_KEY = "spike_bearer_token";
export const BEARER_TOKEN_CHANGED_EVENT = "spike:bearer-token-changed";

export function getClientBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(BEARER_TOKEN_STORAGE_KEY);
    return stored ? stored.trim() : null;
  } catch {
    return null;
  }
}

export function setClientBearerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const clean = token?.trim();
    if (clean) {
      localStorage.setItem(BEARER_TOKEN_STORAGE_KEY, clean);
    } else {
      localStorage.removeItem(BEARER_TOKEN_STORAGE_KEY);
    }
    window.dispatchEvent(
      new CustomEvent(BEARER_TOKEN_CHANGED_EVENT, {
        detail: clean || null,
      })
    );
  } catch {
    // Ignore localStorage access errors
  }
}

export function clearClientBearerToken(): void {
  setClientBearerToken(null);
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getClientBearerToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
