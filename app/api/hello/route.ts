import { getSessionFromRequest } from "@/lib/auth/session";

async function handleAuthenticatedGet(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const session = await getSessionFromRequest(request);

  if (authHeader && !session) {
    return Response.json(
      {
        error: "unauthorized",
        message: "Invalid or revoked Bearer token. Please configure a valid API token in Settings.",
      },
      { status: 401 }
    );
  }

  if (session) {
    return Response.json({
      message: "Hello from vinext on Cloudflare Workers",
      authenticated: true,
      user: session.user,
    });
  }

  return Response.json({
    message: "Hello from vinext on Cloudflare Workers",
  });
}

export function GET(request?: Request): Response | Promise<Response> {
  if (request) {
    return handleAuthenticatedGet(request);
  }

  return Response.json({
    message: "Hello from vinext on Cloudflare Workers",
  });
}
