import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return Response.json(
      {
        authenticated: false,
        user: null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  return Response.json(
    {
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
