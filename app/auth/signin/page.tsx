import { Zap } from "lucide-react";

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
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const error = searchParams?.error;
  const message = searchParams?.message;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 mb-4 group focus:outline-none"
            aria-label="Spike Land home"
          >
            <Zap className="h-7 w-7 fill-cyan-400 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold tracking-tight lowercase text-2xl text-white">
              spike<span className="text-cyan-400">.land</span>
            </span>
          </a>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome to Spike Land
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in or create an account to start building with AI agents.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-300"
            >
              <div className="font-semibold text-red-200">Authentication Failed</div>
              <p className="mt-0.5 text-xs text-red-300/90">
                {message || (error === "access_denied" ? "Access was cancelled or denied." : error)}
              </p>
            </div>
          )}

          {/* Social Sign-in Button */}
          <div className="space-y-3">
            <a
              href="/api/auth/signin/google"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-white/10 hover:border-white/25 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              aria-label="Continue with Google"
            >
              <GoogleIcon className="h-5 w-5" />
              <span>Continue with Google</span>
            </a>
          </div>

          <div className="mt-6 text-center text-xs text-zinc-500">
            By continuing you agree to Spike Land&apos;s{" "}
            <a href="/terms" className="text-zinc-400 underline hover:text-white">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-zinc-400 underline hover:text-white">
              Privacy Policy
            </a>
            .
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
