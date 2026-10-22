# Spike Land Easy MCP Gateway (Zero-Cold-Start Cloudflare Edge MVP)

A single-file, zero-dependency Cloudflare Worker demonstrating **Progressive Context Disclosure** for MCP (Model Context Protocol).

## The Core Thesis
- **Status Quo MCP:** Loads 100+ tools upfront, consuming 30,000–70,000 tokens on **every single LLM turn** and causing severe hallucinations.
- **Spike Land Gateway:** Exposes **3 Universal Gateway Tools** (~600 tokens total). Discovers and dynamically hydrates tools on-demand with 98%+ prompt token reduction.

## Architecture
- **Protocol:** MCP JSON-RPC 2.0 over Streamable HTTP (`/mcp` or `/api/mcp`)
- **Runtime:** Cloudflare Workers Edge (V8 isolates, <5ms cold start)
- **Session State:** Cloudflare KV (`SESSION_KV`)
- **Semantic Discovery:** Cloudflare Workers AI + Vectorize

## The 3 Universal Gateway Tools
1. `discover_tools(query)`: Search across internal catalog & registries by task intent. Automatically mounts matches into active session.
2. `run_tool(tool_name, arguments)`: Execute any discovered tool immediately by name without forcing client to reload.
3. `get_gateway_status()`: Real-time Cloudflare edge datacenter colo, active session tools, turns, and token savings.

## 5-Minute Quickstart

```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Create KV Namespace
wrangler kv namespace create SESSION_KV
# Copy the returned id into wrangler.toml

# 4. Deploy to Global Edge
wrangler deploy
```

## Adding to Cursor / Claude Desktop / Claude Code

### Claude Code:
```bash
claude mcp add spike https://spike.land/mcp
```

### Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "spike-land": {
      "url": "https://spike.land/mcp"
    }
  }
}
```
