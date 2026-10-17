"use client";

import { useAuth } from "@workos-inc/authkit-react";
import { useEffect } from "react";

/**
 * Login route for WorkOS Initiate login URI.
 *
 * This route auto-triggers signIn() for externally-initiated auth flows
 * (password reset emails, invitations, etc.). AuthKit preserves the
 * authentication context through this redirect.
 */
export default function LoginPage() {
  const { signIn, isLoading, user } = useAuth();

  useEffect(() => {
    // Only trigger signIn when AuthKit is ready and user is not authenticated
    if (!isLoading && !user) {
      signIn();
    }
  }, [signIn, isLoading, user]);

  // If already authenticated, redirect to home
  useEffect(() => {
    if (!isLoading && user) {
      window.location.href = "/";
    }
  }, [isLoading, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    </div>
  );
}
