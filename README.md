# Spike Land (`spike.land`)

> Cloudflare-native Next.js App Router on [`vinext`](https://github.com/cloudflare/vinext) featuring the **MCP 2026-07-28 Stateless Progressive-Disclosure Relay** and AI Context Control Plane.

Spike Land solves **MCP Context Bloat and Position-Zero Prompt Cache Invalidation**. Instead of dumping 455+ tool JSON schemas (~50,000 tokens) into every LLM turn, Spike Land exposes 5 cache-preserving broker meta-tools, tracks active capability packs via cryptographically signed `workspace_handle` tokens, and discloses schemas in-band at the message tail alongside output payload slicing.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
  - [The Problem: MCP Context Bloat](#the-problem-mcp-context-bloat)
  - [The Solution: Three-Layer Separation](#the-solution-three-layer-separation)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Start the Development Server](#3-start-the-development-server)
- [Available Scripts](#available-scripts)
- [MCP Client Configuration](#mcp-client-configuration)
  - [Claude Code](#claude-code)
  - [Cursor (`.cursor/mcp.json`)](#cursor-cursormcpjson)
  - [Claude Desktop (`claude_desktop_config.json`)](#claude-desktop-claude_desktop_configjson)
  - [cURL / HTTP Direct Inspection](#curl--http-direct-inspection)
- [Developer Notes](#developer-notes)
  - [Vinext & Cloudflare Workers Runtime](#vinext--cloudflare-workers-runtime)
  - [MCP 2026-07-28 Specifications & SEPs](#mcp-2026-07-28-specifications--seps)
  - [Response Store Caching](#response-store-caching)
  - [Auxiliary Workers](#auxiliary-workers)
  - [Design System & Components](#design-system--components)
- [Testing Guidelines](#testing-guidelines)
  - [Running Tests](#running-tests)
  - [Test Suite Architecture](#test-suite-architecture)
  - [Writing New Tests](#writing-new-tests)
- [Deployment](#deployment)
- [License](#license)

---

## Overview & Architecture

### The Problem: MCP Context Bloat
Standard Model Context Protocol (MCP) implementations require clients to preload the entire catalog into the LLM prompt via `tools/list`. For large enterprise toolkits (455+ tools across 88 categories):
- **~50,000 prompt tokens** are consumed on *every single interaction turn*.
- **Position-Zero Prefix Caching is broken**: Naive proxies dynamically mutate `tools/list` mid-conversation via `notifications/tools/list_changed`, invalidating 100% of the upstream LLM prefix cache.
- **Degraded tool selection accuracy**: LLMs struggle with hallucinations and tool confusion when choosing across hundreds of schemas simultaneously.

### The Solution: Three-Layer Separation

```
[ LLM Agent (Cursor / Claude / Custom) ]
                   │
                   ▼ (1) Static 5 Broker Meta-Tools (Position-Zero Cache Preserved)
         ┌───────────────────┐
         │ Wire-Level Relay  │ <── `tools/list` (TTL: 3600s, cacheScope: "public")
         └─────────┬─────────┘
                   │
                   ▼ (2) In-Band Dynamic Hydration
         ┌───────────────────┐
         │ Working Set State │ <── `workspace_handle` (SEP-2567 signed session)
         └─────────┬─────────┘
                   │
                   ▼ (3) Two-Sided Progressive Disclosure
    ┌──────────────┴──────────────┐
    │                             │
    ▼                             ▼
[ Input Schema Bundling ]     [ Output Payload Slicing ]
(Category activation tail)    (`result_cursor_handle` pagination)
```

1. **Wire-Level MCP Surface (`tools/list`):** Exposes an immutable, deterministically ordered set of **5 Cache-Preserving Broker Meta-Tools** (`list_capability_categories`, `configure_active_categories`, `inspect_tool_schema`, `execute_tool`, `inspect_result_slice`). Token Position Zero remains 100% untouched.
2. **Conversation Working Set (SEP-2567 Handles):** Discloses JSON Schema 2020-12 definitions *in-band at the tail of the message transcript* (`configure_active_categories`) and tracks active packs using cryptographically signed `workspace_handle` tokens (`spk_hdl_v2...`).
3. **Two-Sided Progressive Disclosure & Zero-Trust Governance:**
   - **Input:** On-demand schema disclosure by category.
   - **Output:** Large outputs return a compact summary and a `result_cursor_handle` for surgical slice inspection (`inspect_result_slice`).
   - **Governance:** RFC 8707 OAuth 2.1 audience token exchange, SEP-2322 Multi-Round-Trip Request (MRTR) step-up human approval for sensitive tiers, and SEP-2243 `-32020 HeaderMismatchError` protocol synchronization defense.

---

## Key Features

- **98.7% Prompt Token Reduction:** Shrinks context footprint from ~50k tokens to ~600 tokens per turn.
- **0% Position-Zero Cache Invalidation:** Prefix cache remains warm throughout multi-turn agent runs.
- **Dual-Era Protocol Support:** Native MCP 2026-07-28 Streamable HTTP relay (`/api/mcp`) alongside legacy 2024-11-05 SSE translation (`/api/mcp/sse`).
- **Pattern C URI-Scoped Virtual Gateways:** Dynamic sub-relays (`/api/mcp/g/[gatewaySlug]`) exposing scoped tool catalogs for legacy single-tool clients.
- **Browser-Run Sandbox:** Cloudflare Workers Browser Rendering integration (Puppeteer) for web automation, scraping, and live visual testing.
- **Interactive Web Simulator & Playground:** Live unit-economics ROI calculator and interactive JSON-RPC 2.0 console built directly into the UI.
- **Edge Native Performance:** Sub-5ms isolate cold starts deployed on Cloudflare Workers across 300+ global edge locations.

---

## Tech Stack

| Domain | Technology |
|---|---|
| **Framework** | Next.js App Router on Cloudflare Workers via [`vinext`](https://github.com/cloudflare/vinext) (`@vinext/cloudflare`) |
| **Bundler & Tooling** | Vite 8, `@cloudflare/vite-plugin` (V8 Isolates), `@vitejs/plugin-rsc`, `@vitejs/plugin-react` |
| **Language & Runtime** | TypeScript, React 19, Cloudflare Workers Runtime (`nodejs_compat`) |
| **Styling & UI** | Tailwind CSS v4, `shadcn/ui` (`new-york` style), Radix UI primitives, Lucide Icons |
| **Caching** | `@cloudflare/workers-response-store` (R2/KV backed edge cache adapter) |
| **Testing** | Vitest 5+, `@testing-library/react`, `@testing-library/jest-dom`, JSDOM |
| **Deploy & CLI** | `cf` CLI / `vinext-cloudflare` |

---

## Repository Structure

```
spike-vinext/
├── app/                              # Next.js App Router routes
│   ├── api/                          # Edge API routes
│   │   ├── auth/                     # Google OAuth & session management
│   │   │   ├── callback/google/      # OAuth callback handler
│   │   │   ├── session/              # Session verification endpoint
│   │   │   ├── signin/google/        # OAuth initiation endpoint
│   │   │   └── signout/              # Session invalidation endpoint
│   │   ├── mcp/                      # Core MCP 2026-07-28 Stateless Relay
│   │   │   ├── route.ts              # Streamable HTTP MCP endpoint
│   │   │   ├── g/[gatewaySlug]/      # Pattern C URI-scoped virtual gateways
│   │   │   └── sse/                  # Legacy Dual-Era SSE endpoint
│   │   ├── waitlist/                 # Developer preview registration API
│   │   └── hello/                    # Diagnostic health check endpoint
│   ├── auth/signin/                  # Sign-in UI page
│   ├── mcp/                          # Standalone MCP documentation & playground page
│   ├── waitlist/                     # Boarding pass / waitlist UI
│   ├── layout.tsx                    # Root layout with fonts and metadata
│   ├── page.tsx                      # Landing page with interactive simulator
│   └── globals.css                   # Global styles and Tailwind v4 themes
├── components/                       # UI components
│   ├── ui/                           # Primitive shadcn/ui components (Button, Card, etc.)
│   ├── client-configs.tsx            # Copyable client configs (Cursor, Claude, HTTP)
│   ├── mcp-playground.tsx            # Live JSON-RPC 2.0 interactive test console
│   ├── token-savings-simulator.tsx   # Interactive ROI / Position-Zero cache math
│   ├── hero-section.tsx              # Landing page hero & key metrics counters
│   └── how-it-works.tsx              # Three-Layer Separation visualization
├── lib/                              # Core domain logic
│   ├── auth/                         # JWT signing, verification, and Google OAuth
│   ├── mcp-gateway.ts                # MCP 2026-07-28 engine, handles, & protocol router
│   ├── mcp-types.ts                  # JSON-RPC, SEP specs, and schema TypeScript definitions
│   ├── mcp-data.ts                   # 88 capability categories and tool definitions
│   ├── mcp-registry-data.ts          # External registry server metadata
│   ├── browser-run.ts                # Workers browser rendering utilities
│   └── utils.ts                      # CSS class merging (`cn`) helper
├── test/                             # Automated test suite (117+ tests)
│   ├── api-auth-*.test.ts            # OAuth & authentication route tests
│   ├── auth-*.test.ts                # JWT, session, and crypto unit tests
│   ├── browser-run-mcp.test.ts       # Browser rendering MCP tests
│   ├── mcp-gateway.test.ts           # MCP protocol, SEP-2567 handles, & broker tests
│   ├── page.test.tsx                 # Landing page rendering tests
│   ├── token-savings-simulator.test.tsx # ROI calculator UI tests
│   ├── waitlist.test.tsx             # Waitlist form UI tests
│   └── setup.ts                      # Vitest test setup and jest-dom matchers
├── workers/                          # Standalone / auxiliary Workers
│   ├── browser-run-mcp/              # Dedicated Browser Rendering MCP Worker
│   └── easy-mcp-gateway/             # Zero-cold-start single-worker MVP
├── cloudflare.config.ts              # Cloudflare Worker configuration & service bindings
├── vite.config.ts                    # Vite config with vinext and cloudflare plugins
├── vitest.config.ts                  # Vitest test runner configuration
├── package.json                      # Dependencies and scripts (pnpm 10)
└── PRODUCT.md                        # Product requirements and verification criteria
```

---

## Prerequisites

- **Node.js**: `v20.0.0` or higher (LTS recommended)
- **pnpm**: `v10.0.0+` (repo specifies `pnpm@10.29.2`)
- **Cloudflare Account & CLI** *(for deployment)*: `cf` CLI or `wrangler` logged in with active permissions.

---

## Local Setup

### 1. Clone and Install

```bash
git clone https://github.com/spike-land/spike-vinext.git
cd spike-vinext

# Install dependencies using pnpm
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory for local customization:

```bash
# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:5173"
APP_URL="http://localhost:5173"

# Session & JWT Secrets (used for HMAC session signing and workspace handles)
AUTH_SECRET="your-development-auth-secret-min-32-chars"
# Alternatively: JWT_SECRET or NEXTAUTH_SECRET

# Google OAuth (Optional for local development — mock fallback provided)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/api/auth/callback/google"
```

> **Note:** For local development and testing, if Google OAuth credentials are not provided, the auth service gracefully falls back to mock development identifiers.

### 3. Start the Development Server

```bash
pnpm run dev
```

The application will start with Vite and Cloudflare Worker runtime simulation at:
`http://localhost:5173`

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `pnpm run dev` | `vite dev` | Starts the `vinext` local dev server with RSC and Cloudflare worker environment. |
| `pnpm run build` | `vite build` | Compiles the production build for Cloudflare Workers. |
| `pnpm run start` | `vite preview` | Previews the built production Worker locally. |
| `pnpm run test` | `vitest run` | Runs the full Vitest automated test suite once. |
| `pnpm run test:watch` | `vitest` | Runs Vitest in interactive watch mode for TDD. |
| `pnpm run deploy` | `vinext-cloudflare deploy --warm-cache` | Deploys the main application worker to Cloudflare with cache warming. |
| `pnpm run deploy:response-store` | `cf deploy --prebuilt ...` | Deploys the response store auxiliary cache worker. |

---

## MCP Client Configuration

Connect your AI coding assistant or desktop client to the live Spike Land MCP relay:

### Claude Code

```bash
claude mcp add spike https://spike.land/api/mcp
```

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "spike-land": {
      "url": "https://spike.land/api/mcp",
      "headers": {
        "MCP-Protocol-Version": "2026-07-28"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://spike.land/api/mcp"]
    }
  }
}
```

### cURL / HTTP Direct Inspection

Execute a JSON-RPC 2.0 call directly against the stateless relay:

```bash
curl -X POST https://spike.land/api/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2026-07-28" \
  -H "Mcp-Method: tools/call" \
  -H "Mcp-Name: list_capability_categories" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_capability_categories",
      "arguments": {}
    }
  }'
```

---

## Developer Notes

### Vinext & Cloudflare Workers Runtime
This repository uses [**vinext**](https://github.com/cloudflare/vinext), Cloudflare's official Vite-powered Next.js runtime. 
- All routes execute within Cloudflare Workers V8 isolates (`nodejs_compat`).
- Avoid Node-specific native bindings (e.g. `fs`, `child_process`). Use Web APIs (`fetch`, `crypto.subtle`, `Request`, `Response`, `TransformStream`).
- Path aliases are mapped via `@/*` to the project root in `tsconfig.json` and `vitest.config.ts`.

### MCP 2026-07-28 Specifications & SEPs
Spike Land implements the pure 2026-07-28 stateless operating model:
- **SEP-2549:** Static broker tool metadata includes `cacheScope: "public"` and `ttlMs: 3600000`.
- **SEP-2567:** State is maintained via subject-bound, cryptographically signed `workspace_handle` tokens passed in params, preserving connection independence.
- **SEP-2575:** `server/discover` endpoint for capability negotiation.
- **SEP-2322 (MRTR):** Multi Round-Trip Requests enforce step-up human approval boundaries for dangerous/sensitive actions (`riskTier: "critical"`).
- **SEP-2243:** Desynchronization defense via header validation. Mismatches between HTTP headers (`Mcp-Method`, `Mcp-Name`) and body properties trigger `-32020 HeaderMismatchError`.

### Response Store Caching
Configured in `cloudflare.config.ts` and `vite.config.ts`:
- Employs `@cloudflare/workers-response-store` with an auxiliary service-binding worker (`spike-vinext-response-store`).
- Backed by R2 bucket (`spike-vinext-response-store-cache-bodies`) for edge response caching.

### Auxiliary Workers
- **`workers/browser-run-mcp`**: Independent worker using Cloudflare Workers Browser Rendering (`bindings.browser()`) to execute Puppeteer tasks headlessly at the edge.
- **`workers/easy-mcp-gateway`**: Standalone single-file reference implementation using Cloudflare KV for quick demonstration without Next.js overhead.

### Design System & Components
- Uses Tailwind CSS v4 with CSS variables defined in `app/globals.css`.
- UI primitives are in `components/ui/` adhering to `shadcn/ui` conventions.
- All interactive components support keyboard navigation (`Cmd+K` palette trigger) and full ARIA accessibility roles.

---

## Testing Guidelines

### Running Tests

```bash
# Run all unit and integration tests once
pnpm test

# Run tests in watch mode during development
pnpm test:watch

# Run a specific test file
pnpm test test/mcp-gateway.test.ts

# Run tests matching a name pattern
pnpm test -t "Position-Zero"
```

### Test Suite Architecture

The repository contains 117+ automated tests across 16 test files:

- **Protocol & Gateway (`test/mcp-gateway.test.ts`):** Validates MCP 2026-07-28 JSON-RPC handling, SEP-2243 header guards, SEP-2567 handles, schema hydration, broker tools, and error codes (`-32020`, `-32022`, `-32601`).
- **Auth & Session Security (`test/auth-*.test.ts`, `test/api-auth-*.test.ts`):** Tests HMAC-SHA256 session token generation, cookie parsing, Google OAuth flow, CSRF state protection, and session verification.
- **UI Components & Pages (`test/*.test.tsx`):**
  - `page.test.tsx`: Verifies landing page rendering, metric displays, and interactive tabs.
  - `token-savings-simulator.test.tsx`: Verifies slider controls, pricing formulas, and ROI calculations.
  - `waitlist.test.tsx`: Verifies form validation, submission states, and error handling.
  - `button.test.tsx`, `card.test.tsx`: Component primitive styling and accessibility.
- **Auxiliary Worker Tests (`test/browser-run-mcp.test.ts`):** Validates tool execution, parameter parsing, and schema compatibility for browser rendering tools.

### Writing New Tests

1. Place unit and integration tests inside the `test/` directory using the `.test.ts` or `.test.tsx` extension.
2. For React component tests, use `@testing-library/react` and `@testing-library/user-event`. Matchers from `@testing-library/jest-dom` are loaded automatically via `test/setup.ts`.
3. For API endpoints, invoke the exported `GET` or `POST` handler directly with a standard `Request` object:
   ```ts
   import { POST } from "@/app/api/mcp/route";

   const request = new Request("https://spike.land/api/mcp", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       "MCP-Protocol-Version": "2026-07-28",
       "Mcp-Method": "tools/list",
     },
     body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
   });

   const response = await POST(request);
   const data = await response.json();
   expect(response.status).toBe(200);
   ```
4. Always verify that tests pass before pushing: `pnpm test`.

---

## Deployment

Deploy the application to Cloudflare Workers:

```bash
# 1. Build and deploy the main application worker with warmed cache
pnpm run deploy

# 2. Deploy auxiliary response store cache worker (if updated)
pnpm run deploy:response-store
```

Ensure your Cloudflare environment has the appropriate DNS zones, R2 bucket bindings, and Browser Rendering bindings configured as defined in `cloudflare.config.ts`.

---

## License

This project is licensed under the MIT License.
