import { getProtectedResourceMetadata } from "@/lib/mcp-gateway";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const gatewaySlug = url.searchParams.get("gateway") || undefined;

  return Response.json(getProtectedResourceMetadata(gatewaySlug), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
