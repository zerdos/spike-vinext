import { authenticateWithPassword, toAuthUser } from "@/lib/auth/users-db";
import {
  signSessionToken,
  createSessionCookie,
  DEFAULT_SESSION_MAX_AGE,
} from "@/lib/auth/session";
import { AuthSession } from "@/lib/auth/types";

function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  const contentType = request.headers.get("content-type") || "";
  return (
    contentType.includes("application/json") ||
    (accept.includes("application/json") && !accept.includes("text/html"))
  );
}

function resolveRedirectBase(requestUrl: string): string {
  try {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://spike.land";
  }
}

export async function POST(request: Request) {
  const jsonPreferred = wantsJson(request);
  const baseUrl = resolveRedirectBase(request.url);
  const contentType = request.headers.get("content-type") || "";

  let identifier = "";
  let password = "";
  let returnTo = "/";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        username?: string;
        email?: string;
        identifier?: string;
        password?: string;
        returnTo?: string;
      };
      identifier = (body.username || body.email || body.identifier || "").trim();
      password = body.password || "";
      if (body.returnTo && body.returnTo.startsWith("/")) {
        returnTo = body.returnTo;
      }
    } else {
      const formData = await request.formData();
      identifier = String(
        formData.get("username") ||
          formData.get("email") ||
          formData.get("identifier") ||
          ""
      ).trim();
      password = String(formData.get("password") || "");
      const formReturnTo = formData.get("returnTo");
      if (typeof formReturnTo === "string" && formReturnTo.startsWith("/")) {
        returnTo = formReturnTo;
      }
    }
  } catch {
    if (jsonPreferred) {
      return Response.json(
        { error: "invalid_request", message: "Invalid request payload." },
        { status: 400 }
      );
    }
    const errUrl = new URL("/auth/signin", baseUrl);
    errUrl.searchParams.set("error", "invalid_request");
    errUrl.searchParams.set("message", "Invalid request payload.");
    return Response.redirect(errUrl.toString(), 302);
  }

  if (!identifier || !password) {
    const msg = "Please enter both your username/email and password.";
    if (jsonPreferred) {
      return Response.json(
        { error: "missing_credentials", message: msg },
        { status: 400 }
      );
    }
    const errUrl = new URL("/auth/signin", baseUrl);
    errUrl.searchParams.set("error", "missing_credentials");
    errUrl.searchParams.set("message", msg);
    return Response.redirect(errUrl.toString(), 302);
  }

  const account = await authenticateWithPassword(identifier, password);
  if (!account) {
    const msg = "Invalid username or password.";
    if (jsonPreferred) {
      return Response.json(
        { error: "invalid_credentials", message: msg },
        { status: 401 }
      );
    }
    const errUrl = new URL("/auth/signin", baseUrl);
    errUrl.searchParams.set("error", "invalid_credentials");
    errUrl.searchParams.set("message", msg);
    return Response.redirect(errUrl.toString(), 302);
  }

  const authUser = toAuthUser(account);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const session: AuthSession = {
    user: authUser,
    createdAt: nowSeconds,
    expiresAt: nowSeconds + DEFAULT_SESSION_MAX_AGE,
  };

  const sessionToken = await signSessionToken(session);
  const url = new URL(request.url);
  const isSecure = url.protocol === "https:";
  const sessionCookie = createSessionCookie(
    sessionToken,
    DEFAULT_SESSION_MAX_AGE,
    isSecure
  );

  if (jsonPreferred) {
    return Response.json(
      {
        success: true,
        authenticated: true,
        user: authUser,
        token: sessionToken,
        returnTo,
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": sessionCookie,
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  const redirectTarget = new URL(returnTo, baseUrl).toString();
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTarget,
      "Set-Cookie": sessionCookie,
    },
  });
}
