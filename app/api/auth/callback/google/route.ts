import { processGoogleCallback } from "@/lib/auth/google";
import { createSessionCookie } from "@/lib/auth/session";

function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

function resolveRedirectBase(requestUrl: string): string {
  try {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://spike.land";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const state = url.searchParams.get("state");
  const iss = url.searchParams.get("iss");
  const jsonPreferred = wantsJson(request);
  const baseUrl = resolveRedirectBase(request.url);

  // If Google reported an OAuth error
  if (error) {
    if (jsonPreferred) {
      return Response.json(
        {
          error: "google_oauth_error",
          error_description: errorDescription || error,
        },
        { status: 400 }
      );
    }
    const target = new URL("/auth/signin", baseUrl);
    target.searchParams.set("error", error);
    if (errorDescription) {
      target.searchParams.set("error_description", errorDescription);
    }
    return Response.redirect(target.toString(), 302);
  }

  // Missing code
  if (!code) {
    if (jsonPreferred) {
      return Response.json(
        {
          error: "missing_code",
          error_description: "Missing authorization code from Google OAuth callback",
        },
        { status: 400 }
      );
    }
    const target = new URL("/auth/signin", baseUrl);
    target.searchParams.set("error", "missing_code");
    return Response.redirect(target.toString(), 302);
  }

  try {
    // Current route's URL without query string serves as dynamic redirectUri
    const currentCallbackUri = `${url.origin}${url.pathname}`;

    const result = await processGoogleCallback(
      {
        code,
        error,
        errorDescription,
        state,
        iss,
        redirectUri: currentCallbackUri,
      },
      {
        config: {
          redirectUri: currentCallbackUri,
        },
      }
    );

    const isSecure = url.protocol === "https:";
    const sessionCookie = createSessionCookie(result.sessionToken, undefined, isSecure);

    if (jsonPreferred) {
      return Response.json(
        {
          success: true,
          user: result.user,
          token: result.sessionToken,
          returnTo: result.returnTo || "/",
        },
        {
          status: 200,
          headers: {
            "Set-Cookie": sessionCookie,
          },
        }
      );
    }

    // Determine redirect destination
    const destinationPath = result.returnTo && result.returnTo.startsWith("/")
      ? result.returnTo
      : "/";
    const redirectUrl = new URL(destinationPath, baseUrl).toString();

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": sessionCookie,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";

    if (jsonPreferred) {
      return Response.json(
        {
          error: "callback_error",
          error_description: message,
        },
        { status: 400 }
      );
    }

    const target = new URL("/auth/signin", baseUrl);
    target.searchParams.set("error", "auth_failed");
    target.searchParams.set("message", message);
    return Response.redirect(target.toString(), 302);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      state?: string;
      redirectUri?: string;
    };

    if (!body || !body.code) {
      return Response.json(
        { error: "missing_code", error_description: "Missing code in request body" },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const callbackUri = body.redirectUri || `${url.origin}${url.pathname}`;

    const result = await processGoogleCallback(
      {
        code: body.code,
        state: body.state,
        redirectUri: callbackUri,
      },
      {
        config: {
          redirectUri: callbackUri,
        },
      }
    );

    const isSecure = url.protocol === "https:";
    const sessionCookie = createSessionCookie(result.sessionToken, undefined, isSecure);

    return Response.json(
      {
        success: true,
        user: result.user,
        token: result.sessionToken,
        returnTo: result.returnTo || "/",
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": sessionCookie,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return Response.json(
      {
        error: "callback_error",
        error_description: message,
      },
      { status: 400 }
    );
  }
}
