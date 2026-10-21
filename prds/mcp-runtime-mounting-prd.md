# Product Requirements Document (PRD): Runtime MCP Server Mounting (`mount_mcp_server`)

**Document Version:** 1.0  
**Target File:** `./prds/mcp-runtime-mounting-prd.md`  
**Date:** 2026-10-21  
**Author:** Spike Land Engineering  
**Status:** Implemented & Verified / Complete  
**Target Runtime:** Cloudflare Workers (`spike-vinext` / Edge V8 Isolates + Cloudflare KV)

---

## 1. Executive Summary & Core Thesis

Standard Model Context Protocol (MCP) clients (Cursor, Claude Desktop, Claude Code, Windsurf) treat MCP servers as **static boot-time dependencies**. Adding a new MCP server requires manually editing a local configuration file (`.mcp.json` or `claude_desktop_config.json`), configuring API keys in plaintext, restarting the IDE/client, and immediately swallowing the token cost of every tool schema exposed by that server on every subsequent prompt turn.

**Runtime MCP Server Mounting** allows an AI agent connected to the Spike Land Gateway to discover, authenticate, mount, and execute tools from any remote HTTP/SSE MCP server **mid-conversation, in a single turn, with zero client restarts and <100 tokens of context overhead.**

When an upstream server is mounted, the Spike Land Cloudflare Worker intercepts its full `tools/list` catalog, caches the schemas in edge session state (KV) under a deterministic namespace, and exposes those tools solely through progressive disclosure (`discover_tools` and `run_tool`).

---

## 2. Problem Statement

1. **The Restart & Config Friction Loop:** If an agent realizes mid-task that it needs a database inspector, a Linear issue tracker, or a custom internal staging server, the user must stop the chat, edit `.mcp.json`, restart the client, and lose conversational momentum.
2. **Upstream Schema Bloat:** A single third-party MCP server (e.g., GitHub, Notion, or Postgres) often exposes 20 to 60 tools (3,000–10,000 tokens). Mounting three external servers directly to a client adds ~20,000 tokens of permanent system prompt overhead.
3. **Inconsistent Client `list_changed` Support:** While the MCP specification includes `notifications/tools/list_changed`, real-world support across Cursor, Claude Code, and custom harnesses is unreliable or requires manual UI refreshes.
4. **Plaintext Credential Exposure in Chat:** Passing raw API keys or bearer tokens inside an LLM conversation (`"Use my API key sk_live_123..."`) leaks sensitive credentials into third-party LLM provider prompt logs.

---

## 3. Goals & Non-Goals

### 3.1 Goals (In-Scope for MVP)
* **Zero-Restart In-Chat Mounting:** Enable agents to mount remote MCP servers by Registry ID (`smithery`, `glama`, `official`) or direct URL (`https://.../mcp`) during an active chat session.
* **Edge Schema Interception:** Fetch the upstream server's `tools/list` at the Cloudflare Worker edge, store the full JSON schemas in Cloudflare KV, and return only a compact summary (<100 tokens) to the LLM.
* **Namespaced Progressive Discovery:** Seamlessly index mounted server tools alongside the native Spike Land catalog so `discover_tools(query)` searches both internal and session-mounted tools.
* **Transparent Edge Proxying:** Route `run_tool("<namespace>.<tool_name>", args)` calls directly to the upstream MCP server over Streamable HTTP or SSE, handling JSON-RPC framing and timeouts at the edge.
* **Vault Reference Authentication:** Support `vault:<SECRET_NAME>` references so agents can authenticate upstream servers using pre-configured user secrets without ever exposing raw tokens to the LLM context window.

### 3.2 Non-Goals (Deferred to v2)
* **Arbitrary `stdio` Container Spawning at the Edge:** Cloudflare Workers V8 isolates cannot spawn `child_process` or run arbitrary `npx` / Docker binaries. Servers that *only* support `stdio` will gracefully fall back to generating a 1-click local `.mcp.json` snippet (or resolve to a hosted Smithery/Glama HTTP bridge if available).
* **Multi-hop Interactive OAuth Popups Mid-Tool-Call:** Interactive browser OAuth flows will be initiated via a returned authorization URL rather than blocking the synchronous JSON-RPC tool call.

---

## 4. System Architecture & Runtime Flow

### 4.1 The 3-Step Mid-Chat Mounting Lifecycle

```text
┌──────────────┐          ┌───────────────────────────┐          ┌────────────────────────┐
│  MCP Client  │          │  Spike Land Edge Gateway  │          │ Upstream MCP Server    │
│ (Claude/IDE) │          │ (CF Worker + KV Session)  │          │ (Remote HTTP / SSE)    │
└──────┬───────┘          └─────────────┬─────────────┘          └───────────┬────────────┘
       │                                │                                    │
       │ 1. run_tool("mount_mcp_server",│                                    │
       │    { url, namespace: "pg" })   │                                    │
       ├───────────────────────────────►│                                    │
       │                                │ 2. POST initialize & tools/list    │
       │                                ├───────────────────────────────────►│
       │                                │                                    │
       │                                │ 3. Returns 35 full tool schemas    │
       │                                │◄───────────────────────────────────┤
       │                                │   (~4,500 tokens)                  │
       │                                │                                    │
       │                                ├───► [Intercept & Cache in CF KV]   │
       │                                │     Namespace: "pg."               │
       │                                │                                    │
       │ 4. Return Compact Summary      │                                    │
       │    ("Mounted pg: 35 tools.     │                                    │
       │     Use discover_tools...")    │                                    │
       │◄───────────────────────────────┤                                    │
       │    (~75 tokens!)               │                                    │
       │                                │                                    │
       │ 5. discover_tools("table schema")                                   │
       ├───────────────────────────────►│                                    │
       │                                ├───► [Search Internal + KV "pg."]   │
       │ 6. Return ONLY pg.describe_table                                    │
       │    schema (~110 tokens)        │                                    │
       │◄───────────────────────────────┤                                    │
       │                                │                                    │
       │ 7. run_tool("pg.describe_table", { table: "users" })                │
       ├───────────────────────────────►│                                    │
       │                                │ 8. Proxy JSON-RPC tools/call       │
       │                                │    + Inject Vault Secret Header    │
       │                                ├───────────────────────────────────►│
       │                                │                                    │
       │                                │ 9. Upstream Execution Result       │
       │                                │◄───────────────────────────────────┤
       │ 10. Forward Tool Output        │                                    │
       │◄───────────────────────────────┤                                    │
       ┴                                ┴                                    ┴
```

---

## 5. Detailed Feature Specifications

### 5.1 Gateway Tool Signatures

Depending on whether the client is using the **5-Tool Gateway** or the **Simplified 3-Tool Gateway**, mounting is exposed either as a first-class meta-tool or as a built-in system capability callable via `run_tool`.

#### Tool 1: `mount_mcp_server`
Mounts a remote HTTP/SSE MCP server or a Registry server into the current session's KV state without returning the full schema list.

* **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "source": {
        "type": "string",
        "description": "Either a direct HTTPS MCP endpoint URL (e.g. 'https://mcp.linear.app/sse') or a registry identifier (e.g. 'smithery:@modelcontextprotocol/server-github')."
      },
      "namespace": {
        "type": "string",
        "pattern": "^[a-z0-9_]{2,16}$",
        "description": "Short prefix for all tools from this server (e.g. 'gh', 'pg', 'linear')."
      },
      "transport": {
        "type": "string",
        "enum": ["auto", "streamable-http", "sse"],
        "default": "auto",
        "description": "MCP transport protocol to use for the upstream handshake."
      },
      "authSecretRef": {
        "type": "string",
        "description": "Optional Spike Land Vault reference (e.g. 'vault:GITHUB_TOKEN' or 'vault:STAGING_DB_KEY'). Never pass raw plaintext secrets."
      }
    },
    "required": ["source", "namespace"]
  }
  ```

* **Output Payload (Compact Summary — Strict Token Cap):**
  ```json
  {
    "status": "mounted",
    "namespace": "pg",
    "serverInfo": {
      "name": "postgres-mcp-server",
      "version": "1.2.0"
    },
    "transportUsed": "streamable-http",
    "toolCount": 18,
    "sampleTools": [
      "pg.query_readonly",
      "pg.describe_table",
      "pg.list_schemas",
      "pg.explain_query",
      "pg.get_indexes"
    ],
    "nextStepHint": "Call discover_tools({ query: 'pg <keyword>' }) to load specific parameter schemas before calling run_tool()."
  }
  ```

#### Tool 2: `unmount_mcp_server`
Removes a mounted server and purges its cached schemas from the active session.

* **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "namespace": {
        "type": "string",
        "description": "The namespace prefix of the mounted server to remove."
      }
    },
    "required": ["namespace"]
  }
  ```

#### Tool 3: `list_mounted_servers`
Returns active runtime-mounted servers in the current session, their health status, tool counts, and latency.

---

### 5.2 Upstream Handshake & Schema Interception Engine

When `mount_mcp_server` is invoked, the Cloudflare Worker performs the following sequence within a hard 5,000 ms timeout budget:

1. **URL & Transport Resolution:**
   * If `source` starts with `https://` (or `http://` in local dev), validate against SSRF blocklists.
   * If `source` is a registry slug (e.g., `@smithery/...`), query the cached Spike Land Registry index to resolve its hosted Streamable HTTP/SSE endpoint.
   * **Fallback for STDIO-only packages:** If the registry entry only supports local stdio and has no hosted bridge, return `status: "stdio_only"` with the exact `claude mcp add` / `.mcp.json` snippet so the user can attach it locally if desired.
2. **Protocol Handshake (`initialize`):**
   * Dispatch JSON-RPC `initialize` (`protocolVersion: "2024-11-05"`) with Authorization headers injected from `authSecretRef` if provided.
   * If `transport: "auto"`, attempt POST (Streamable HTTP) first; on 405 Method Not Allowed or SSE headers (`text/event-stream`), fall back to the SSE handshake flow.
3. **Catalog Fetch (`tools/list`):**
   * Request `tools/list` from the upstream server.
   * Normalize every returned tool by prefixing its name with `<namespace>.` (e.g., `create_issue` becomes `linear.create_issue`).
   * Strip excessive markdown bloat from upstream descriptions if a single description exceeds 500 characters, keeping a clean summary for BM25 indexing.
4. **KV Persistence:**
   * Store the normalized `MountedRemoteServer` object inside the session's `MCPSessionState` in Cloudflare KV (TTL: 24 hours, sliding window on activity).

---

### 5.3 Unified Search & Hydration (`discover_tools` Update)

The `discover_tools` handler is updated to search across a Unified Virtual Catalog:

$$\text{Virtual Catalog} = \text{Internal Catalog (455 tools)} \cup \bigcup_{ns \in \text{Session}} \text{MountedTools}(ns)$$

* **Ranking Boost for Mounted Servers:** Because a user who just mounted a server mid-chat almost certainly intends to use it immediately, tools belonging to a server mounted within the last 10 turns receive a 1.25x relevance score boost in keyword/semantic matching.
* **Direct Prefix Filtering:** If the query begins with `<namespace>.` or `<namespace> ` (e.g., `discover_tools("pg foreign keys")`), the search engine scopes primarily to that mounted namespace.

---

### 5.4 Proxied Tool Execution (`run_tool` Update)

When the agent calls `run_tool({ tool_name: "pg.describe_table", arguments: { table: "users" } })`:

1. **Namespace Resolution:**
   * Split `tool_name` on the first `.` delimiter (`namespace = "pg"`, `upstreamToolName = "describe_table"`).
   * Look up `session.mountedServers["pg"]` in Cloudflare KV.
2. **Input Schema Validation (Edge Pre-Flight):**
   * Validate arguments against the cached JSON Schema for `pg.describe_table` at the Cloudflare Worker edge before making a network hop. If required fields are missing, immediately return a structured validation error to the agent (saving upstream round-trip latency).
3. **Credential Hydration & Outbound Dispatch:**
   * Resolve `authSecretRef` from encrypted storage at request time.
   * Send JSON-RPC 2.0 `tools/call` with `{ name: "describe_table", arguments: { table: "users" } }` to the upstream endpoint.
4. **Response Sanitization & Token Guardrails:**
   * Enforce a configurable max response payload size (default: 32 KB / ~8,000 tokens). If an upstream tool dumps a massive raw JSON payload (e.g., 5,000 database rows), truncate gracefully and append a system truncation warning so the upstream server cannot accidentally blow up the LLM's context window.

---

## 6. Data Models & TypeScript Interfaces

```typescript
// ./src/types/mcp-mounting.ts

export type UpstreamTransport = "streamable-http" | "sse";

export interface MountedToolDefinition {
  /** Namespaced name exposed to the agent, e.g. "linear.create_issue" */
  namespacedName: string;
  /** Original tool name expected by the upstream server, e.g. "create_issue" */
  upstreamName: string;
  namespace: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MountedRemoteServer {
  namespace: string;
  source: string;
  endpointUrl: string;
  transport: UpstreamTransport;
  serverInfo: {
    name: string;
    version: string;
  };
  /** Vault reference handle, e.g., "vault:LINEAR_API_KEY". Never store plaintext keys in session KV. */
  authSecretRef?: string;
  /** Custom non-sensitive headers if needed */
  customHeaders?: Record<string, string>;
  tools: MountedToolDefinition[];
  mountedAt: number;
  lastCalledAt?: number;
  status: "healthy" | "degraded" | "unreachable";
}

export interface MCPSessionState {
  sessionId: string;
  workspaceId?: string;
  createdAt: number;
  lastActiveAt: number;
  activatedCategories: string[];
  activatedTools: string[];
  /** Map of namespace -> MountedRemoteServer */
  mountedServers: Record<string, MountedRemoteServer>;
  metrics: {
    turns: number;
    upstreamSchemasIntercepted: number;
    estimatedTokensSaved: number;
  };
}
```

---

## 7. Security, SSRF Protection & Credential Isolation

Allowing an edge worker to make outbound HTTP requests based on tool parameters introduces SSRF and credential leakage risks. The following guardrails are mandatory for MVP:

### 7.1 Zero-Plaintext Secret Policy (The `vault:` Protocol)

* **Rule:** `mount_mcp_server` rejects raw `Authorization: Bearer ...` strings in its arguments if they match high-entropy secret patterns (`sk_`, `ghp_`, `xoxb-`, `eyJ...`).
* **Behavior:** If an agent attempts to pass a raw token, the gateway rejects the mount call with:
  > *"Security Error: Do not pass raw API keys in chat. Add your key at https://spike.land/settings/vault and pass authSecretRef: 'vault:YOUR_KEY_NAME'."*
* **Resolution:** Vault secrets are stored encrypted (AES-GCM via Web Crypto API) in Cloudflare D1/KV keyed by `workspaceId` and injected solely inside the outbound `fetch()` call to the verified domain.

### 7.2 Outbound SSRF & Loopback Prevention

* **Protocol Enforcement:** Upstream URLs MUST use `https://` in production (`http://localhost` permitted only in local `wrangler dev`).
* **IP & Host Blocklist:** Block outbound requests to:
  * Private IPv4/IPv6 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.169.254` cloud metadata endpoints, `::1`).
  * Recursive self-mounting (`*.spike.land/api/mcp*`) to prevent infinite proxy loops.

### 7.3 Resource Limits & Quotas

* **Max Mounted Servers per Session:** 10 namespaces per active session (Free tier: 3, Workspace tier: 10).
* **Max Tools per Mounted Server:** 200 tools (prevents malicious upstream servers from exhausting Worker KV memory via a 50MB `tools/list` bomb).
* **Upstream Timeout:** 5,000 ms for handshake (`initialize` + `tools/list`); 15,000 ms for `tools/call` execution.

---

## 8. Token Economics of Runtime Mounting

To illustrate why edge interception is critical for runtime mounting, consider a user who mounts GitHub MCP (42 tools) and Postgres MCP (18 tools) mid-conversation:

| Metric | Standard Client Mount (`.mcp.json`) | Spike Land Runtime Mount (`mount_mcp_server`) |
| :--- | :--- | :--- |
| **Client Restart Required?** | Yes | No (In-Chat) |
| **Schemas Loaded at Mount** | 60 schemas (~7,200 tokens/turn) | 0 schemas (75-token mount summary) |
| **Schemas Loaded on `discover_tools`** | N/A (All 60 always in context) | 1–3 matched schemas (~220 tokens once) |
| **Extra Cost Over 20 Turns** | 144,000 tokens | ~295 tokens |
| **Token Savings on Mounted Servers** | Baseline (0%) | **99.79% Reduction** |

---

## 9. User Interface & Playground Updates (`/mcp`)

1. **"Mount Custom Server" Modal in `/mcp` Playground:**
   * Input field for Server URL or Smithery/Glama search autocomplete.
   * Namespace badge preview (e.g., `linear.*`).
   * Vault secret selector dropdown (`vault:GITHUB_TOKEN`, `+ Create New Secret`).
   * Live indicator showing: *"Intercepted 34 upstream tools → Saved 3,910 tokens/turn"*.
2. **Session Inspector Sidebar:**
   * Displays currently mounted external servers alongside built-in categories, with a 1-click "Unmount" button and live ping latency badge.

---

## 10. Phased Implementation Plan

### Phase 1: Core Proxy & State Engine (Days 1–3)
- [x] Extend `MCPSessionState` in KV to store `mountedServers: Record<string, MountedRemoteServer>`.
- [x] Build `UpstreamMCPClient` in pure TypeScript (fetch-based Streamable HTTP + fallback SSE parser, zero Node dependencies).
- [x] Implement SSRF validator and recursive loop guard.
- [x] Implement `mount_mcp_server`, `unmount_mcp_server`, and `list_mounted_servers` handlers.

### Phase 2: Unified Search & Execution Routing (Days 4–5)
- [x] Update `discover_tools` / `search_tools` to index `session.mountedServers[ns].tools` with the 1.25x recency boost.
- [x] Update `run_tool` / `tools/call` dispatcher to detect `<namespace>.<tool>` prefixes, validate input schemas at the edge, and proxy the JSON-RPC call upstream.
- [x] Add 32 KB response payload truncation guard for noisy upstream tools.

### Phase 3: Vault Secret Resolution & UI (Days 6–7)
- [x] Implement `vault:<KEY_NAME>` resolution from workspace encrypted KV store and plaintext secret rejection regex.
- [x] Add "Mount External MCP" interactive tab to `components/mcp-playground.tsx`.
- [x] Write integration test suite (`test/mcp-runtime-mount.test.ts`) using mock upstream HTTP/SSE MCP servers.

---

## 11. Acceptance Criteria & Test Scenarios

* **AC1 (In-Chat Mount & Call):** Starting from a fresh session with only the gateway tools exposed, an agent can call `mount_mcp_server` against a test HTTP MCP server, call `discover_tools` to find a tool on that server, and execute it via `run_tool` without the MCP client disconnecting or re-initializing.
* **AC2 (Token Budget Compliance):** Mounting an upstream server with 50 tools adds $\le 120$ tokens to the tool response payload returned to the LLM.
* **AC3 (Plaintext Secret Rejection):** Calling `mount_mcp_server` with a raw `ghp_...` or `sk_...` string in any parameter fails fast with a descriptive instruction to use a `vault:` reference.
* **AC4 (Graceful STDIO Fallback):** Calling `mount_mcp_server` with a Registry ID that only supports local stdio returns a structured fallback response containing the local `.mcp.json` configuration block rather than throwing an unhandled 500 error.
