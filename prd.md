# Product Requirements Document (PRD): Cloudflare Agent Harness + Spike Land Meta-MCP (MVP)

**Document Version:** 1.0 (MVP)  
**Target File:** `./prd.md`  
**Date:** 2026-10-22  
**Status:** Draft — MVP Scope  
**Target Runtime:** Cloudflare Workers (V8 Isolates + Cloudflare KV)

---

## 1. Executive Summary

This PRD defines the **Minimum Viable Product (MVP)** for a serverless AI Agent Harness running on Cloudflare Workers that connects to **Spike Land Meta-MCP Servers**. 

Instead of loading dozens of MCP server schemas into the LLM system prompt at boot time, the agent starts with a minimal **3-Tool Meta-MCP Gateway** (`mount_mcp_server`, `discover_tools`, `run_tool`). During an active conversation, the agent can dynamically mount remote Streamable HTTP MCP servers, search their schemas via Cloudflare KV, and execute proxied tool calls—all within a single execution loop with near-zero context window bloat.

---

## 2. MVP Scope (Goals & Non-Goals)

### 2.1 In-Scope for MVP
1. **Cloudflare Worker Agent Loop:** A stateless HTTP endpoint (`POST /chat`) that runs a multi-turn LLM tool-calling loop (up to 5 steps per request) backed by Cloudflare KV for session state.
2. **3 Meta-MCP Gateway Tools:**
   - `mount_mcp_server`: Connects to a remote Streamable HTTP MCP server, fetches `tools/list`, caches schemas in KV under a namespace, and returns a <100-token summary.
   - `discover_tools`: Performs keyword matching across internal Spike Land tools and session-mounted server schemas stored in KV, returning the top 3 full JSON schemas.
   - `run_tool`: Routes tool execution either to native Spike Land tools or proxies JSON-RPC `tools/call` to the mounted upstream MCP server.
3. **Environment Secret Injection (`env:`):** Securely inject bearer tokens from Cloudflare Worker environment variables/secrets (`env:<SECRET_NAME>`) so raw API keys never enter the LLM prompt.
4. **Core Guardrails:** HTTPS enforcement, SSRF private-IP blocking, and a 32 KB response truncation limit.

### 2.2 Out-of-Scope (Deferred to Post-MVP)
- Registry slug resolution (Smithery/Glama) — *MVP requires direct `https://` MCP URLs.*
- Legacy SSE transport fallback — *MVP supports MCP Streamable HTTP (`POST`) only.*
- Interactive UI / `/mcp` Playground modals and custom D1 Vault UI.
- `unmount_mcp_server` and `list_mounted_servers` management tools — *MVP relies on 24h KV TTL expiry.*
- Local `stdio` fallback snippet generation.

---

## 3. Architecture & Runtime Flow

```text
┌──────────┐       ┌────────────────────────────┐       ┌────────────────────────┐
│  Client  │       │  CF Worker Agent Harness   │       │  Spike Land / Remote   │
│ (HTTP)   │       │  (LLM Loop + KV Session)   │       │  MCP Server (HTTPS)    │
└────┬─────┘       └─────────────┬──────────────┘       └───────────┬────────────┘
     │ 1. POST /chat             │                                  │
     ├──────────────────────────►│                                  │
     │                           │ 2. LLM calls mount_mcp_server    │
     │                           │    { url, namespace: "pg" }      │
     │                           ├─────────────────────────────────►│
     │                           │    POST initialize + tools/list  │
     │                           │◄─────────────────────────────────┤
     │                           │    Cache 35 schemas in CF KV     │
     │                           │                                  │
     │                           │ 3. LLM calls discover_tools      │
     │                           │    ("pg table schema")           │
     │                           ├───► [Query KV & Return Top 3]    │
     │                           │                                  │
     │                           │ 4. LLM calls run_tool            │
     │                           │    ("pg.describe_table", args)   │
     │                           ├─────────────────────────────────►│
     │                           │    POST tools/call (+ Secret)    │
     │                           │◄─────────────────────────────────┤
     │ 5. Final Agent Response   │                                  │
     │◄──────────────────────────┤                                  │
```

---

## 4. MVP Tool Specifications

The Agent Harness exposes **only these 3 tools** to the LLM in the initial system prompt:

### 4.1 `mount_mcp_server`

Intercepts an upstream MCP server's catalog and caches it in Cloudflare KV.

* **Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "Direct HTTPS MCP endpoint URL (e.g., 'https://spike.land/mcp' or 'https://api.example.com/mcp')."
    },
    "namespace": {
      "type": "string",
      "pattern": "^[a-z0-9_]{2,16}$",
      "description": "Short prefix for tools from this server (e.g., 'spike', 'pg', 'gh')."
    },
    "authSecretName": {
      "type": "string",
      "description": "Optional name of the Worker environment secret to inject as Bearer token (e.g., 'GITHUB_TOKEN'). Never pass raw secrets."
    }
  },
  "required": ["url", "namespace"]
}
```

* **Output Payload (<100 tokens):**
```json
{
  "status": "mounted",
  "namespace": "pg",
  "toolCount": 18,
  "sampleTools": ["pg.query", "pg.describe_table", "pg.list_schemas"],
  "hint": "Call discover_tools({ query: 'pg <keyword>' }) to get parameter schemas."
}
```

### 4.2 `discover_tools`

Searches cached tool descriptions and names in the current KV session and returns full JSON schemas for matching tools.

* **Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Keywords or namespace prefix to search for (e.g., 'pg describe table')."
    }
  },
  "required": ["query"]
}
```

* **Output Payload:** Returns an array of up to **3** matching `MountedToolDefinition` objects (including full `inputSchema`).

### 4.3 `run_tool`

Executes a discovered tool by its namespaced name.

* **Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "tool_name": {
      "type": "string",
      "description": "Namespaced tool name (e.g., 'pg.describe_table')."
    },
    "arguments": {
      "type": "object",
      "description": "Key-value arguments matching the tool's inputSchema."
    }
  },
  "required": ["tool_name", "arguments"]
}
```

---

## 5. Data Models (`src/types.ts`)

```typescript
export interface Env {
  SESSION_KV: KVNamespace;
  LLM_API_KEY: string;
  // Dynamic upstream secrets stored as Worker secrets (e.g. env["GITHUB_TOKEN"])
  [key: string]: unknown;
}

export interface MountedToolDefinition {
  namespacedName: string; // e.g., "pg.describe_table"
  upstreamName: string;   // e.g., "describe_table"
  namespace: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MountedServer {
  namespace: string;
  url: string;
  authSecretName?: string;
  tools: MountedToolDefinition[];
  mountedAt: number;
}

export interface SessionState {
  sessionId: string;
  mountedServers: Record<string, MountedServer>;
}
```

---

## 6. Core Implementation Requirements

### 6.1 Upstream Handshake (`mount_mcp_server`)

1. Validate `url` begins with `https://` and does not resolve to private/loopback IP ranges (`127.0.0.1`, `10.x`, `192.168.x`, `169.254.169.254`, `*.spike.land/api/mcp*`).
2. Reject the call if `authSecretName` or `url` matches raw secret patterns (`sk_`, `ghp_`, `Bearer `).
3. Send a JSON-RPC 2.0 `tools/list` POST request to `url` with a `5,000 ms` `AbortSignal.timeout`. If `authSecretName` is provided, attach `Authorization: Bearer ${env[authSecretName]}`.
4. Prefix each returned tool with `<namespace>.`, cap `description` at 300 characters, and save to `SESSION_KV` under `session:${sessionId}` (TTL: `86400` seconds).

### 6.2 Keyword Discovery (`discover_tools`)

1. Load `SessionState` from `SESSION_KV`.
2. Score all tools across `mountedServers` by simple case-insensitive token overlap against `namespacedName` and `description` (with a 2x weight if the query starts with the tool's `namespace`).
3. Return the top 3 matching tools with their full `inputSchema`.

### 6.3 Proxied Execution (`run_tool`)

1. Split `tool_name` on the first `.` into `[namespace, upstreamName]`.
2. Look up `mountedServers[namespace]` in `SESSION_KV`.
3. Dispatch a JSON-RPC 2.0 `tools/call` POST request with `{ name: upstreamName, arguments }` and a `15,000 ms` timeout.
4. Read the response text; if it exceeds `32,768` characters (~8,000 tokens), slice to `32,768` characters and append `"\n...[TRUNCATED BY EDGE HARNESS]"`.

---

## 7. MVP Acceptance Criteria

* [ ] **AC1 (Zero-Restart Mount & Execute):** In a single `POST /chat` request, the agent can mount a Spike Land or third-party HTTP MCP server, discover a tool schema via `discover_tools`, and execute it via `run_tool`.
* [ ] **AC2 (Token Cap):** `mount_mcp_server` output never exceeds 100 tokens regardless of whether the upstream server has 5 or 100 tools.
* [ ] **AC3 (No Plaintext Secrets):** Raw API keys passed in tool arguments are rejected before any outbound `fetch` is made; valid `authSecretName` references inject the secret from Cloudflare `env` headers only.
* [ ] **AC4 (Payload & Timeout Safety):** Upstream calls exceeding 15s abort cleanly with a structured JSON-RPC error return to the LLM, and responses >32 KB are truncated without crashing the Worker isolate.
