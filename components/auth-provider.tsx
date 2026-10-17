"use client";

import { AuthKitProvider } from "@workos-inc/authkit-react";

function getClientId(): string {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_WORKOS_CLIENT_ID) {
      return import.meta.env.VITE_WORKOS_CLIENT_ID;
    }
  } catch {
    // fallback
  }
  if (typeof process !== "undefined" && process.env?.VITE_WORKOS_CLIENT_ID) {
    return process.env.VITE_WORKOS_CLIENT_ID;
  }
  if (typeof process !== "undefined" && process.env?.WORKOS_CLIENT_ID) {
    return process.env.WORKOS_CLIENT_ID;
  }
  return "client_01M55093PZQ1PPYKZ31WXSVMH9";
}

function getRedirectUri(): string | undefined {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_WORKOS_REDIRECT_URI) {
      return import.meta.env.VITE_WORKOS_REDIRECT_URI;
    }
  } catch {
    // fallback
  }
  if (typeof process !== "undefined" && process.env?.VITE_WORKOS_REDIRECT_URI) {
    return process.env.VITE_WORKOS_REDIRECT_URI;
  }
  if (typeof process !== "undefined" && process.env?.WORKOS_REDIRECT_URI) {
    return process.env.WORKOS_REDIRECT_URI;
  }
  return undefined;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();

  return (
    <AuthKitProvider
      clientId={clientId}
      redirectUri={redirectUri}
      onRedirectCallback={({ state }) => {
        if (typeof state?.returnTo === "string" && state.returnTo.startsWith("/")) {
          window.location.href = state.returnTo;
        } else {
          window.location.href = "/";
        }
      }}
    >
      {children}
    </AuthKitProvider>
  );
}
