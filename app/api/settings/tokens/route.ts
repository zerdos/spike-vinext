import { getSessionFromRequest } from "@/lib/auth/session";
import {
  findUserById,
  listUserApiTokens,
  createUserApiToken,
  revokeUserApiToken,
  updateUserProviderTokens,
} from "@/lib/auth/users-db";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session || !session.user) {
    return Response.json(
      { error: "unauthorized", message: "You must be signed in to view API tokens." },
      { status: 401 }
    );
  }

  const user = await findUserById(session.user.id);
  const tokens = await listUserApiTokens(session.user.id);

  return Response.json(
    {
      tokens,
      providerTokens: user?.providerTokens || {
        SPIKE_API_KEY: "",
        OPENAI_API_KEY: "",
        ANTHROPIC_API_KEY: "",
        GITHUB_TOKEN: "",
        CLOUDFLARE_API_TOKEN: "",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session || !session.user) {
    return Response.json(
      { error: "unauthorized", message: "You must be signed in to manage API tokens." },
      { status: 401 }
    );
  }

  let body: {
    action?: "create_token" | "save_provider_tokens";
    name?: string;
    provider?: string;
    customTokenValue?: string;
    scopes?: string[];
    providerTokens?: Record<string, string>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { error: "invalid_request", message: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  // If saving provider tokens (e.g. OPENAI_API_KEY, ANTHROPIC_API_KEY, etc. or custom key-value tokens)
  if (body.action === "save_provider_tokens" || body.providerTokens) {
    if (!body.providerTokens || typeof body.providerTokens !== "object") {
      return Response.json(
        { error: "missing_tokens", message: "providerTokens object is required." },
        { status: 400 }
      );
    }

    const updated = await updateUserProviderTokens(
      session.user.id,
      body.providerTokens
    );

    if (!updated.success) {
      return Response.json(
        { error: "update_failed", message: updated.error || "Failed to save API tokens." },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "API tokens saved successfully.",
        providerTokens: updated.providerTokens,
      },
      { status: 200 }
    );
  }

  // Otherwise create a new API token record
  const name = (body.name || "").trim();
  if (!name) {
    return Response.json(
      { error: "missing_name", message: "Token name is required." },
      { status: 400 }
    );
  }

  const created = await createUserApiToken(session.user.id, {
    name,
    provider: body.provider,
    customTokenValue: body.customTokenValue,
    scopes: body.scopes,
  });

  return Response.json(
    {
      success: true,
      message: "API token created successfully.",
      token: created,
    },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session || !session.user) {
    return Response.json(
      { error: "unauthorized", message: "You must be signed in to revoke API tokens." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  let tokenId = url.searchParams.get("id") || "";

  if (!tokenId) {
    try {
      const body = (await request.json()) as { id?: string };
      tokenId = body.id || "";
    } catch {
      // Ignore
    }
  }

  if (!tokenId) {
    return Response.json(
      { error: "missing_id", message: "Token ID is required to revoke a token." },
      { status: 400 }
    );
  }

  const deleted = await revokeUserApiToken(session.user.id, tokenId);
  if (!deleted) {
    return Response.json(
      { error: "not_found", message: "API token not found." },
      { status: 404 }
    );
  }

  return Response.json(
    {
      success: true,
      message: "API token revoked.",
      id: tokenId,
    },
    { status: 200 }
  );
}
