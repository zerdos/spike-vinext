# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary Users — AI & Full-Stack Engineers:** Developers using MCP-capable coding agents and IDEs (Claude Desktop, Cursor, Claude Code, Windsurf, Cline/Roo, or custom agent SDKs) who need access to hundreds of external tools without blowing up their prompt token budget or degrading tool selection accuracy.
- **Secondary Users — Engineering Leaders & Technical Investors:** CTOs, VP Eng, and seed/Series A investors evaluating the unit economics, latency, and token savings of Spike Land's edge-native MCP gateway against static MCP tool catalogs.

## Product Purpose

Spike Land (`spike.land`) is an open-source AI development platform and Cloudflare-native Model Context Protocol (MCP) Gateway. It solves **MCP Context Bloat**: instead of forcing an LLM to ingest 455+ tool JSON schemas (~50,000 tokens) on every single turn, Spike Land uses **Progressive Context Disclosure** to expose a minimal set of lightweight gateway meta-tools (~600 tokens) and dynamically discover, unlock, and execute tools across 88 categories on demand.

Success means visitors immediately grasp the Progressive Context Disclosure mechanism, verify their own team's financial and context-window savings in the interactive simulator, test live JSON-RPC 2.0 tool execution in the playground, copy a 1-click client configuration snippet, or reserve a spot on the early developer preview waitlist.

## Positioning

Unlike static MCP servers or container-hosted tool hubs that dump dozens of schemas into every prompt and suffer from 1,200ms+ Docker cold starts, Spike Land runs 100% on **Cloudflare Workers V8 Isolates** across 300+ global edge locations (<5ms startup) with **Progressive Context Disclosure**—cutting prompt token overhead by up to 98.7% and keeping active session context under 6 tools for 99.2% tool call accuracy.

## Operating Context

- Used alongside terminal CLI workflows (`claude mcp add`), IDE JSON configuration files (`.mcp.json`, `claude_desktop_config.json`, `cursor-mcp-settings.json`), and JSON-RPC 2.0 over Streamable HTTP (`/api/mcp`).
- Evaluated through live interactive inspection: adjusting team size / daily agent turns / LLM pricing benchmarks (`Claude Sonnet 5.5`, `GPT-6 Astra`, `Claude Haiku 5.5`, `Claude Opus 5.5`, `DeepSeek R2 / V4`, `Gemini 3.5 Pro`), running live or edge-simulated tool calls (`search_tools`, `code_runner`, `generate_image`, `git_diff_viewer`, `seo_audit`, `mcp_registry_search`), and sharing referral boarding passes on the developer waitlist.

## Capabilities and Constraints

- **Framework & Stack:** Next.js App Router on Cloudflare Workers via `vinext` (`@vinext/cloudflare`), React 19, Tailwind CSS v4, and `shadcn/ui` (`new-york` style, Radix UI primitives, Lucide icons).
- **Routes & Surfaces:**
  - `/` and `/mcp`: Flagship landing page with Header (`Cmd+K` search shortcut), Hero section (455 Tools, 88 Categories, 5 Gateway Tools, `.mcp.json` copy card), Interactive Unit Economics & Token Savings Simulator, Interactive MCP Playground (9 curated categories, live `/api/mcp` JSON-RPC 2.0 execution, Response/Request/cURL tabs), How It Works (3-step progressive disclosure: Connect → Discover → Activate), Tool Categories CTA, Get Connected client configuration tabs (`Claude Desktop`, `Claude Code`, `Cursor`, `HTTP`), and Footer with newsletter subscription.
  - `/waitlist`: Early Developer Preview (Cohort 2 / Alpha-2) registration form (email, name, primary AI client selector, primary use case selector, optional GitHub handle for priority queue) that issues a digital boarding pass ticket with queue position (`#429+`), referral code (`SPK-...`), invite link copy, and X/Twitter share action.
  - `/auth/signin`: Authentication surface supporting Google OAuth (`/api/auth/signin/google`), error alert display via `searchParams`, and legal links.
- **Architectural & Test Constraints:**
  - All pages and interactive sections must be built with composable `shadcn/ui` components (`components/ui/*`) rather than ad-hoc raw HTML templates.
  - Existing route structure, API contracts (`/api/mcp`, `/api/waitlist`, `/api/auth/*`), interactive capabilities, accessibility roles/labels, and Vitest test suites (`pnpm test`) must pass without regression.

## Brand Commitments

- **Brand Name:** Spike Land (`spike.land`)
- **Core Terminology:** Progressive Context Disclosure, MCP Gateway, Gateway Tools, Cloudflare Edge Isolate.

## Evidence on Hand

- Verified catalog metrics: **455 AI Tools**, **88 Categories**, **5 Gateway Tools** (and 3 Universal Gateway Tools in the Edge MVP worker), **98.2%–98.7% token savings**, **99.2% tool selection accuracy**, **< 5ms edge startup latency**, **96.5% gross margin**, **100,000 free monthly calls** for early preview cohort.
- Live interactive tool catalog in `lib/mcp-data.ts` and `lib/mcp-registry-data.ts`.
- Do not fabricate customer logos, unverified testimonials, or fictional enterprise case studies.

## Product Principles

1. **Demonstrate the Mechanism Live:** Never merely claim efficiency—let the developer or investor feel Progressive Context Disclosure through live JSON-RPC execution and real-time unit economics math.
2. ** Precision Over Decoration:** Every control, metric read-out, and schema inspector should read with the clarity and tactile rigor of a high-craft engineering instrument.
3. **Composable Component Discipline:** Every surface—from marketing hero to interactive console, waitlist boarding pass, and sign-in—speaks one unified design system built on accessible `shadcn/ui` primitives.
4. **Zero-Friction Onboarding:** Keep copyable configurations (`.mcp.json`, CLI commands, cURL payloads, investor briefs) one click away at all times.
