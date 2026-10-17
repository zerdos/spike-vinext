"use client";

import { useAuth } from "@workos-inc/authkit-react";
import { useEffect } from "react";

export default function CallbackPage() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Check if error is present in query parameters
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      const target = `/auth/signin?error=${encodeURIComponent(error)}${
        errorDescription ? `&message=${encodeURIComponent(errorDescription)}` : ""
      }`;
      window.location.href = target;
      return;
    }

    // Once AuthKit finishes exchanging the authorization code
    if (!isLoading) {
      const returnTo = sessionStorage.getItem("returnTo") || "/";
      sessionStorage.removeItem("returnTo");
      window.location.href = returnTo;
    }
  }, [isLoading, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <h2 className="text-lg font-semibold tracking-tight">Completing authentication...</h2>
        <p className="text-xs text-muted-foreground">
          Please wait while your session is authenticated with WorkOS.
        </p>
      </div>
    </div>
  );
}
