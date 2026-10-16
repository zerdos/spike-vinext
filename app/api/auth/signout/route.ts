import { createClearSessionCookie } from "@/lib/auth/session";

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
  const clearCookie = createClearSessionCookie();
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/";
  const baseUrl = resolveRedirectBase(request.url);

  if (wantsJson(request)) {
    return Response.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Set-Cookie": clearCookie,
        },
      }
    );
  }

  const destination = returnTo.startsWith("/") ? returnTo : "/";
  const redirectUrl = new URL(destination, baseUrl).toString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      "Set-Cookie": clearCookie,
    },
  });
}

export async function POST(request: Request) {
  const clearCookie = createClearSessionCookie();
  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": clearCookie,
      },
    }
  );
}
