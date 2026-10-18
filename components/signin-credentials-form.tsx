"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface SignInCredentialsFormProps {
  initialError?: string;
  returnTo?: string;
}

export function SignInCredentialsForm({
  initialError,
  returnTo = "/",
}: SignInCredentialsFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError || "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (!username.trim() || !password) {
      setErrorMessage("Please enter your username/email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
          returnTo,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        returnTo?: string;
        message?: string;
        error?: string;
      };

      if (res.ok && data.success) {
        const destination =
          data.returnTo && data.returnTo.startsWith("/") ? data.returnTo : "/";
        window.location.href = destination;
        return;
      }

      setErrorMessage(
        data.message || data.error || "Invalid username or password."
      );
    } catch {
      setErrorMessage("Unable to connect to authentication server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      action="/api/auth/signin/credentials"
      method="POST"
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <input type="hidden" name="returnTo" value={returnTo} />

      {errorMessage && (
        <Alert variant="destructive" aria-live="polite">
          <AlertTitle>Authentication Failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="username">Username or Email</Label>
        <div className="relative">
          <User className="h-4 w-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
          <Input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin@spike.land"
            autoComplete="username"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="current-password">Password</Label>
        </div>
        <div className="relative">
          <Lock className="h-4 w-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
          <Input
            id="current-password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            enterKeyHint="done"
            required
            className="pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047BB] rounded-sm p-0.5"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        variant="default"
        size="lg"
        disabled={loading}
        className="w-full border-2 border-[#111315] font-semibold"
      >
        {loading ? (
          <span>Signing in...</span>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </>
        )}
      </Button>
    </form>
  );
}
