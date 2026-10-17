import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

interface SignInPageProps {
  searchParams?: Promise<{ error?: string; message?: string }>;
}

export default async function SignInPage(props: SignInPageProps) {
  const searchParams = props.searchParams
    ? await props.searchParams
    : undefined;
  const error = searchParams?.error;
  const message = searchParams?.message;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="inline-flex items-center gap-2.5 group"
              aria-label="Spike Land home"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground border border-[#111315]">
                <Zap className="h-4 w-4 fill-current" />
              </span>
              <span className="font-display font-black tracking-tight lowercase text-2xl text-foreground">
                spike<span className="text-primary">.land</span>
              </span>
            </a>
            <Badge variant="outline" className="font-mono text-[11px]">
              SECURE SIGN IN
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Welcome to Spike Land
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in or create an account to start building with AI agents.
          </p>
        </div>

        {/* shadcn Card */}
        <Card className="border-2 border-[#111315] overflow-hidden">
          <CardHeader className="bg-secondary/60 border-b border-[#111315] p-5">
            <CardTitle className="text-base">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Access your developer workspace and manage your MCP keys.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Authentication Failed</AlertTitle>
                <AlertDescription>
                  {message ||
                    (error === "access_denied"
                      ? "Access was cancelled or denied."
                      : error)}
                </AlertDescription>
              </Alert>
            )}

            {/* Social Sign-in Button */}
            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full border-2 border-[#111315] font-semibold"
            >
              <a
                href="/api/auth/signin/google"
                aria-label="Continue with Google"
              >
                <GoogleIcon className="h-5 w-5" />
                <span>Continue with Google</span>
              </a>
            </Button>
          </CardContent>

          <CardFooter className="bg-secondary/40 border-t border-[#111315] px-6 py-4 text-center">
            <p className="w-full text-xs text-muted-foreground">
              By continuing you agree to Spike Land&apos;s{" "}
              <a
                href="/terms"
                className="text-foreground font-semibold underline hover:text-primary"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="text-foreground font-semibold underline hover:text-primary"
              >
                Privacy Policy
              </a>
              .
            </p>
          </CardFooter>
        </Card>

        <div className="text-center">
          <Button variant="ghost" size="sm" asChild>
            <a href="/">← Back to home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
