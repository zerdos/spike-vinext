import { createGoogleAuthorizationUrl } from "@/lib/auth/google";

function resolveCallbackUri(requestUrl: string): string {
  try {
    const url = new URL(requestUrl);
    return `${url.origin}/api/auth/callback/google`;
  } catch {
    return "https://spike.land/api/auth/callback/google";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || undefined;
  const prompt = url.searchParams.get("prompt") || undefined;
  const loginHint = url.searchParams.get("login_hint") || undefined;
  const callbackUri = resolveCallbackUri(request.url);

  const authUrl = createGoogleAuthorizationUrl({
    config: {
      redirectUri: callbackUri,
    },
    returnTo,
    prompt,
    loginHint,
  });

  return Response.redirect(authUrl, 302);
}

export async function POST(request: Request) {
  let returnTo: string | undefined;
  let prompt: string | undefined;
  let loginHint: string | undefined;

  try {
    const body = (await request.json()) as {
      returnTo?: string;
      prompt?: string;
      loginHint?: string;
    };
    returnTo = body.returnTo;
    prompt = body.prompt;
    loginHint = body.loginHint;
  } catch {
    // Empty body is acceptable
  }

  const callbackUri = resolveCallbackUri(request.url);
  const authUrl = createGoogleAuthorizationUrl({
    config: {
      redirectUri: callbackUri,
    },
    returnTo,
    prompt,
    loginHint,
  });

  return Response.json({ url: authUrl });
}
