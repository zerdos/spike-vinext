# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary Users — AI & Full-Stack Engineers:** Developers using MCP 2026-07-28 and legacy MCP-capable coding agents and IDEs (Claude Desktop, Cursor, Claude Code v2.1.227+, Codex v0.147.0+, Windsurf, or custom agent SDKs) who need access to hundreds of external tools without blowing up their prompt token budget, invalidating their Position-Zero LLM prefix cache, or degrading tool selection accuracy.
- **Secondary Users — Engineering Leaders, CISOs & Technical Investors:** CTOs, VP Eng, CISOs, and seed/Series A investors evaluating the unit economics, Position-Zero cache preservation, RFC 8707 OAuth 2.1 security, and MRTR step-up governance of Spike Land's stateless edge MCP relay against naive `tools/list`-mutating proxies.

## Product Purpose

Spike Land (`spike.land`) is an open-source AI context and governance control plane and Cloudflare-native **MCP 2026-07-28 Stateless Progressive-Disclosure Relay**. It solves **MCP Context Bloat & Position-Zero Prompt Cache Invalidation**: instead of forcing an LLM to ingest 455+ tool JSON schemas (~50,000 tokens) upfront or dynamically mutating `tools/list` mid-conversation (which violates SEP-2567 connection independence and invalidates 100% of the upstream LLM Position-Zero prefix cache), Spike Land implements the **Three-Layer Separation Principle**:

1. **Wire-Level MCP Surface (`tools/list`):** Exposes a static, deterministically ordered set of **5 Cache-Preserving Broker Meta-Tools** (`list_capability_categories`, `configure_active_categories`, `inspect_tool_schema`, `execute_tool`, `inspect_result_slice`) with `cacheScope: "public"` and `ttlMs: 3600000` (SEP-2549), keeping Token Position Zero 100% immutable.
2. **Conversation Working Set (SEP-2567 Handles):** Tracks active deterministic capability packs via cryptographically signed, subject-bound `workspace_handle` tokens (`spk_hdl_v2...`) and discloses JSON Schema 2020-12 definitions **in-band at the tail of the message transcript** (`configure_active_categories`).
3. **Two-Sided Progressive Disclosure & Zero-Trust Governance:** Combines Input Schema Bundling with Output Payload Slicing (`result_cursor_handle` via `inspect_result_slice`), **RFC 8707 OAuth 2.1 Audience Token Exchange** (zero token passthrough), **SEP-2322 Multi Round-Trip Request (MRTR)** step-up human approval at the category activation boundary, and **SEP-2243 `-32020 HeaderMismatchError`** desynchronization defense.

## Positioning

Unlike static MCP servers that dump hundreds of schemas into every prompt, or naive v1 proxies that mutate `tools/list` via `notifications/tools/list_changed` (breaking on stateless 2026-07-28 HTTP transports and destroying LLM prefix caches), or probabilistic top-K embedding routers (which suffer from sibling-tool fragmentation in multi-step workflows), Spike Land delivers **Deterministic Capability Packs**, **Two-Sided Progressive Disclosure**, and **Zero-Passthrough OAuth 2.1 / MRTR Governance** on **Cloudflare Workers V8 Isolates** (<5ms startup) across 300+ global edge locations.

## Operating Context

- Used alongside terminal CLI workflows (`claude mcp add`), IDE JSON configuration files (`.mcp.json`, `claude_desktop_config.json`, `cursor-mcp-settings.json`), Stateless Streamable HTTP (`/api/mcp` with `MCP-Protocol-Version: 2026-07-28`, `Mcp-Method`, `Mcp-Name`), URI-Scoped Virtual Gateways (`/api/mcp/g/{gateway_slug}`), and Dual-Era legacy SSE translation (`/api/mcp/sse`).
- Evaluated through live interactive inspection: adjusting team size / daily agent turns / LLM pricing benchmarks, verifying Position-Zero prefix cache savings, running live JSON-RPC 2.0 calls (`configure_active_categories`, `execute_tool`, `inspect_result_slice`, `search_tools`, `code_runner`, `generate_image`), and reserving an early preview boarding pass on `/waitlist`.

## Capabilities and Constraints

- **Framework & Stack:** Next.js App Router on Cloudflare Workers via `vinext` (`@vinext/cloudflare`), React 19, Tailwind CSS v4, and `shadcn/ui` (`new-york` style, Radix UI primitives, Lucide icons).
- **Routes & Surfaces:**
  - `/` and `/mcp`: Flagship landing page with Header (`Cmd+K` search shortcut), Hero section (455 Tools, 88 Categories, 5 Gateway Tools, `.mcp.json` 2026-07-28 copy card), Interactive Unit Economics & Position-Zero Cache Simulator, Interactive MCP Playground (live `/api/mcp` JSON-RPC 2.0 execution with SEP-2243 headers), How It Works (Three-Layer Separation: Connect → Discover → Activate), Tool Categories CTA, Get Connected client configuration tabs (`Claude Desktop`, `Claude Code`, `Cursor`, `HTTP`), and Footer.
  - `/api/mcp`: Dual-Era MCP 2026-07-28 Stateless Relay supporting `server/discover` (SEP-2575), `subscriptions/listen`, `tasks/get` (SEP-2663), `-32020 HeaderMismatchError` (SEP-2243), `-32022 UnsupportedProtocolVersionError`, SEP-2567 `workspace_handle`, SEP-2322 MRTR step-up elicitations, and legacy `initialize` translation.
  - `/api/mcp/g/[gatewaySlug]`: Pattern C URI-Scoped Virtual Gateways serving role-scoped, deterministically ordered `tools/list` catalogs for native-tool clients.
  - `/.well-known/oauth-protected-resource`: RFC 9728 OAuth 2.1 Protected Resource Metadata with Client ID Metadata Documents (CIMD) and RFC 8707 audience binding rules.
  - `/waitlist` & `/auth/signin`: Developer preview registration and Google OAuth sign-in surfaces.
- **Architectural & Test Constraints:**
  - All pages and interactive sections must be built with composable `shadcn/ui` components (`components/ui/*`).
  - Existing route structure, API contracts (`/api/mcp`, `/api/waitlist`, `/api/auth/*`), interactive capabilities, accessibility roles/labels, and Vitest test suites (`pnpm test`) must pass without regression.

## Brand Commitments

- **Brand Name:** Spike Land (`spike.land`)
- **Core Terminology:** Two-Sided Progressive Context Disclosure, MCP 2026-07-28 Stateless Relay, Position-Zero Cache Stability, SEP-2567 Workspace Handle, Deterministic Capability Packs, MRTR Step-Up Governance.

## Evidence on Hand

- Verified catalog metrics: **455 AI Tools**, **88 Categories**, **5 Static Broker Meta-Tools**, **98.7% prompt token savings**, **0% Position-Zero prefix cache invalidation**, **up to 98% output token reduction via payload slicing**, **99.2% tool selection accuracy**, **< 5ms edge startup latency**, **96.5% gross margin**.
- Live interactive tool catalog in `lib/mcp-data.ts` and `lib/mcp-registry-data.ts`.
- Do not fabricate customer logos, unverified testimonials, or fictional enterprise case studies.

## Product Principles

1. **Demonstrate the Mechanism Live:** Let the developer or investor verify Two-Sided Progressive Disclosure, SEP-2567 `workspace_handle` state, and Position-Zero cache preservation through live JSON-RPC execution and real-time unit economics math.
2. **Precision Over Decoration:** Every control, metric read-out, and schema inspector should read with the clarity and tactile rigor of a high-craft engineering instrument.
3. **Composable Component Discipline:** Every surface speaks one unified design system built on accessible `shadcn/ui` primitives.
4. **Zero-Friction Onboarding:** Keep copyable 2026-07-28 configurations (`.mcp.json`, CLI commands, SEP-2243 cURL payloads, investor briefs) one click away at all times.
