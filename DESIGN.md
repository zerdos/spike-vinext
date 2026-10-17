---
name: Spike Land
description: Swiss federal dispatch & cartographic atlas design system for Progressive Context Disclosure MCP tools on Cloudflare Workers V8 isolates.
colors:
  vermilion: "#E03C1F"
  vermilion-hover: "#C22F15"
  vermilion-active: "#A82610"
  cobalt: "#0047BB"
  cobalt-hover: "#003894"
  emerald: "#0D7A5F"
  amber: "#B45309"
  destructive: "#BA1C1C"
  paper: "#F5F4F0"
  paper-recessed: "#EAE8E1"
  paper-recessed-hover: "#DFDDD4"
  sheet: "#FFFFFF"
  ink: "#111315"
  ink-hover: "#25292E"
  ink-secondary: "#3D434D"
  border-subtle: "#C8C5BC"
  terminal-well: "#1B1E23"
  terminal-border: "#343942"
  terminal-muted: "#B8BDC7"
typography:
  display:
    fontFamily: "Chivo, Archivo, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 5.25rem)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Chivo, Archivo, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Chivo, Archivo, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
    fontFeature: "tnum"
  caption:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.35
    fontFeature: "tnum"
  micro:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.3
    fontFeature: "tnum"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.vermilion-hover}"
  button-primary-active:
    backgroundColor: "{colors.vermilion-active}"
  button-outline:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.paper-recessed}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-cobalt:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  card-default:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "40px"
  badge-default:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
  badge-cobalt:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
  badge-emerald:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
---

# Design System: Spike Land

## Overview

**Creative North Star: "The Swiss Federal Protocol Timetable"**

Spike Land rejects the AI developer category's dark-neon aurora glassmorphism cliché in favor of daylight-legible architectural grid precision inspired by Swiss federal railway timetables (SBB) and Josef Müller-Brockmann technical cartography. Because Spike Land solves MCP context bloat by routing 5 lightweight gateway meta-tools to 88 categories and 455 tools on demand, the visual system treats every tool catalog, unit-economics simulator, and JSON-RPC 2.0 payload like an authoritative public dispatch schedule printed on warm alabaster stock.

Surfaces are constructed from tactile paper layers and crisp white inspection sheets bound by exposed `1px` and `2px` carbon-ink structural hairlines (`#111315`). Information density is high yet effortlessly scannable: numbers lead before labels, tabular monospace aligns token footprints and dollar metrics to the pixel, and dark carbon-ink wells appear strictly inside recessed code, terminal, and `.mcp.json` inspection blocks rather than across the viewport canvas.

**Key Characteristics:**
- Daylight-first technical paper palette (`#F5F4F0` canvas, `#EAE8E1` recessed stone index, `#FFFFFF` crisp card sheets) with zero ambient drop shadows or translucent glass blurs.
- Exposed structural hairlines (`1px` and `2px` solid `#111315`) and secondary table cell rules (`1px` solid `#C8C5BC`) that make the 12-column grid and data tables physically legible.
- Tri-color railway signal semantics: SBB Signal Vermilion (`#E03C1F`) for primary actions and dispatch emphasis, Swiss Route Cobalt (`#0047BB`) for route markers, protocol identifiers, and focus rings, and Telemetry Emerald (`#0D7A5F`) for verified token savings and edge latency readouts.
- Self-hosted neo-grotesque and technical typography (`Chivo` display headers, `Archivo` UI prose, and `JetBrains Mono` tabular numerals) engineered for zero layout shift and rapid engineering inspection.

## Colors

The palette pairs high-contrast archival paper and carbon ink with three functional railway signal accents that encode action, routing, and verified telemetry.

### Primary
- **SBB Signal Vermilion** (`#E03C1F` / `hsl(9 76% 50%)`): Reserved for primary call-to-action buttons, active dispatch status indicators, protocol underlines, text selection highlights, and native form accent controls (`accent-color` and `caret-color`). Deepens to `#C22F15` on hover and `#A82610` on active press.

### Secondary
- **Swiss Route Cobalt** (`#0047BB` / `hsl(217 100% 37%)`): Used for MCP tool identifiers (`search_tools`, `enable_category`), category route badges, interactive focus rings (`2px solid #0047BB`), and secondary technical actions (`cobalt` button and badge variants, hovering to `#003894`).

### Tertiary
- **Telemetry Emerald** (`#0D7A5F`): Dedicated to verified efficiency proof points—token reduction badges (`-98.7% PROMPT OVERHEAD`), edge isolate latency readouts, schema token footprints (`118 tok`), and clipboard confirmation checks.
- **Dispatch Amber** (`#B45309`): Used sparingly for rate-limit warnings or transitional state callouts.
- **Signal Crimson** (`#BA1C1C` / `hsl(0 74% 42%)`): Used exclusively for destructive actions, error alerts, and `:user-invalid` form field borders.

### Neutral
- **Warm Alabaster Paper** (`#F5F4F0` / `hsl(48 17% 95%)`): The global viewport background (`--paper` / `--background`) and inverted text color inside dark carbon-ink headers and terminal wells.
- **Stone Index Surface** (`#EAE8E1` / `hsl(47 16% 90%)`): Recessed surface (`--paper-recessed` / `--secondary`) used for table headers, card footers, tab strips, icon badges, and secondary buttons (shifting to `#DFDDD4` on hover).
- **Crisp Sheet** (`#FFFFFF` / `hsl(0 0% 100%)`): Elevated inspection surface (`--sheet` / `--card`) for cards, data tables, form inputs, and outline buttons.
- **Carbon Ink** (`#111315` / `hsl(210 11% 7%)`): Primary typography (`--ink` / `--foreground`), structural `1px`/`2px` borders (`--border`), inverted card headers, and the `.mcp.json` inspection chrome.
- **Technical Slate** (`#3D434D` / `hsl(218 11% 27%)`): High-contrast secondary copy (`--ink-secondary` / `--muted-foreground`), maintaining an 8.6:1 contrast ratio on Warm Alabaster Paper for effortless technical reading.
- **Secondary Cell Rule** (`#C8C5BC` / `hsl(45 12% 76%)`): Subtle interior divider (`--border-subtle`) for table row rules, secondary button borders, and keyboard shortcut caps (`kbd`).
- **Terminal Well & Chrome** (`#1B1E23` background, `#343942` border, `#B8BDC7` muted caption): Confined strictly to embedded code blocks and JSON-RPC inspection wells inside dark Carbon Ink containers.

### Named Rules
**The Daylight Paper Rule.** The application canvas must remain daylight-legible Warm Alabaster Paper (`#F5F4F0`) and Crisp Sheet (`#FFFFFF`). Dark surfaces (`#111315` and `#1B1E23`) are restricted to bounded card headers, active tab triggers, and embedded code/JSON inspection panels—never full-bleed page backgrounds.

**The Signal Trio Rule.** Never mix decorative gradients or arbitrary rainbow tags into the interface. Every chromatic accent must map to one of three functional signals: Vermilion (`#E03C1F`) for primary user action/urgency, Cobalt (`#0047BB`) for protocol routing/focus, or Emerald (`#0D7A5F`) for verified token and latency telemetry.

## Typography

**Display Font:** `Chivo` (weights 700, 900; fallback `Archivo, sans-serif`)
**Body Font:** `Archivo` (weights 400, 500, 600, 700; fallback `-apple-system, BlinkMacSystemFont, sans-serif`)
**Label/Mono Font:** `JetBrains Mono` (weights 400, 600, 700; fallback `monospace`)

**Character:** Monumental neo-grotesque display headlines (`Chivo` 900) anchor the page like stamped railway platform signs, while `Archivo` (shipped in place of the direction brief's provisional `Inter` to maintain grotesque structural harmony with `Chivo`) handles dense UI controls and technical prose, and `JetBrains Mono` locks every metric, tool identifier, and JSON schema into tabular alignment.

### Hierarchy
- **Display** (`900`, `clamp(2.25rem, 6vw, 5.25rem)` / `text-4xl sm:text-7xl lg:text-[5.25rem]`, line-height `0.94`, tracking `-0.03em`): Hero thesis headline (`455 AI Tools. One Protocol.`), set with `text-wrap: balance` and paired with heavy `4px` structural underlines (`underline-offset-8`).
- **Headline** (`900`, `2.25rem` / `36px`, line-height `1.08`, tracking `-0.025em`): Major section headers across the Unit Economics Simulator, MCP Playground, How It Works, and Waitlist surfaces.
- **Title** (`700`, `1.125rem` / `18px` or `1rem` / `16px`, line-height `1.25`, tracking `-0.015em`): Card titles (`CardTitle`) and dispatch table headers set in `Chivo` bold.
- **Body** (`400`–`600`, `1rem` / `16px` and `0.875rem` / `14px`, line-height `1.625` / `leading-relaxed`): Explanatory technical prose constrained to a maximum measure of `65ch` for comfortable scanning.
- **Label & Telemetry** (`600`–`700`, `0.75rem` / `12px` and `0.6875rem` / `11px`, line-height `1.4`, `tabular-nums`): Set in `JetBrains Mono` for protocol badges (`CLOUDFLARE V8 ISOLATES`), tool names (`search_tools`), token footprints (`118 tok`), and large index counters (`text-4xl sm:text-5xl font-bold tabular-nums`).

### Named Rules
**The Tabular Telemetry Rule.** Every numeric counter, token footprint, dollar ROI figure, latency readout, and tool slug must use `JetBrains Mono` with `font-variant-numeric: tabular-nums` so live slider updates and table columns never jitter horizontally.

**The Number-First Index Rule.** In metric summary cells (such as the `455` / `88` / `5` hero index), the large tabular numeral (`36px`–`48px` bold mono) always leads at the top of the cell, with its concise semantic label (`12px` semibold slate) positioned directly underneath.

## Layout

 Pages are organized on a centered `1280px` (`max-w-7xl`) architectural container with `16px` (`px-4`) horizontal padding and full-bleed `2px` solid Carbon Ink (`#111315`) horizontal section rules (`border-b-2 border-[#111315]`) that separate major functional instruments like pages in a technical atlas.

- **Asymmetric 12-Column Hero Grid:** On desktop (`lg:grid-cols-12`, `gap-8 lg:gap-10`), the primary viewport splits into a **7-column** thesis and 3-cell ruled index counter on the left and a **5-column** live gateway dispatch table + `.mcp.json` configuration sheet on the right.
- **Internal Ruled Sub-Grids:** Multi-metric cards use flush internal hairlines (`divide-y sm:divide-y-0 sm:divide-x divide-[#111315]`) with `20px`–`24px` (`p-5 sm:p-6`) internal cell padding rather than floating separate mini-cards.
- **Vertical Rhythm:** Major sections breathe with `48px` mobile (`py-12`), `64px` tablet (`sm:py-16`), and `80px` desktop (`lg:py-20`) vertical padding.
- **Viewport Hygiene:** Both `html` and `body` enforce `overflow-x: hidden; max-width: 100%`, and flex/grid children declare `min-w-0` so wide JSON-RPC payloads and `<pre>` blocks scroll internally without breaking mobile viewports.

## Elevation & Depth

Spike Land is an intentionally **flat, tonal-and-hairline architectural system** (`box-shadow: none` across all cards, buttons, and inputs). Depth and hierarchy are communicated through paper stock contrast (`#F5F4F0` vs. `#EAE8E1` vs. `#FFFFFF` vs. `#111315`) and line weight (`1px` standard border vs. `2px` primary structural frame).

### Surface Layering Vocabulary
- **Base Canvas (`--paper` `#F5F4F0`):** The ambient page background.
- **Recessed Stone Well (`--paper-recessed` `#EAE8E1`):** Used inside table headers, card footers, segmented `TabsList` tracks, and icon wells to sit visually half a step into the page.
- **Elevated Inspection Sheet (`--sheet` `#FFFFFF`):** Crisp white surface used for cards, active table bodies, and form inputs to bring interactive data forward against the warm paper canvas.
- **Inverted Dispatch Header (`--ink` `#111315`):** High-contrast Carbon Ink header bands and code panels that anchor terminal and configuration instruments.

### Named Rules
**The Zero-Shadow Hairline Rule.** Never apply ambient `box-shadow`, `backdrop-filter: blur()`, or neumorphic bevels to cards, buttons, or modals. Structural separation is achieved strictly through `1px` or `2px` solid `#111315` borders and paper-tint shifts.

## Shapes

The form language balances crisp architectural framing with tactile, machined corner radii grounded in `--radius: 0.75rem` (`12px`).

- **Primary Containers & Cards (`rounded-xl` / `12px`):** All `Card` primitives use a `12px` outer radius paired with `overflow-hidden` so full-bleed dark headers (`CardHeader`), flush data tables, and recessed footers clip cleanly to the structural border.
- **Interactive Controls & Badges (`rounded-md` / `10px`):** Buttons, text inputs, select triggers, tab buttons, and protocol badges use `--radius-md` (`calc(var(--radius) - 2px)` = `10px`), giving controls a substantial, mechanical feel.
- **Segmented Tracks (`rounded-lg` / `12px`):** `TabsList` containers wrap `10px`-radius triggers inside a `12px`-radius recessed stone track (`p-1` / `4px` inset) bordered by `1px solid #111315`.
- **Keyboard Caps & Brand Stamp (`rounded-sm` / `8px`):** Compact inline elements such as the `32px × 32px` header lightning stamp and `Cmd+K` `<kbd>` tags use the tighter `--radius-sm` (`8px`).
- **Border Weights:** Major hero cards, primary section dividers, and sticky navigation bars use `2px solid #111315`; standard cards, inputs, outline buttons, and table headers use `1px solid #111315`; interior table rows and secondary pills use `1px solid #C8C5BC`.

## Components

Every component is built on bespoke-styled `shadcn/ui` primitives engineered to feel like tactile dispatch instruments with immediate state feedback.

### Buttons
- **Shape:** Medium machined radius (`10px` / `rounded-md`) with `14px` (`text-sm`) semibold label text and `8px` (`gap-2`) icon spacing.
- **Primary (`default`):** SBB Signal Vermilion (`#E03C1F`) background with white (`#FFFFFF`) text; `40px` (`h-10`) default height (`px-4 py-2`), `44px` (`h-11 px-6`) large height, and `32px` (`h-8 px-3 text-xs`) small height.
- **Hover / Focus / Active:** Primary buttons shift cleanly to `#C22F15` on hover and `#A82610` on active press (`transition-colors`). Keyboard focus applies a high-visibility `2px` Swiss Route Cobalt (`#0047BB`) ring with a `2px` offset.
- **Secondary / Outline / Cobalt / Ink / Ghost:**
  - `outline`: Crisp white sheet (`#FFFFFF`) with a `1px solid #111315` border, shifting to Stone Index (`#EAE8E1`) on hover.
  - `secondary`: Recessed Stone Index (`#EAE8E1`) with a `1px solid #C8C5BC` border, shifting to `#DFDDD4` on hover.
  - `cobalt`: Swiss Route Cobalt (`#0047BB`) background with white text, shifting to `#003894` on hover.
  - `ink`: Carbon Ink (`#111315`) background with Warm Alabaster (`#F5F4F0`) text, shifting to `#25292E` on hover.
  - `ghost`: Transparent at rest, filling with `#EAE8E1` on hover (used for top-level header navigation items).

### Badges / Protocol Stamps
- **Style:** Inline flex pill (`rounded-md` / `10px`, `px-2.5 py-0.5`, `12px` semibold) with `6px` (`gap-1.5`) internal spacing. Frequently paired with `font-mono` for protocol metadata.
- **Variants:** `default` (Vermilion `#E03C1F`), `cobalt` (Route Cobalt `#0047BB`), `emerald` (Telemetry Emerald `#0D7A5F`), `ink` (Carbon Ink `#111315`), `secondary` (Stone `#EAE8E1` with `#C8C5BC` border), and `outline` (White `#FFFFFF` with `#111315` border, used for the live pulsing status badge).

### Cards / Dispatch Containers
- **Corner Style:** `12px` (`rounded-xl`) with `overflow-hidden` when housing flush tables or dark headers.
- **Background:** Crisp Sheet (`#FFFFFF`) body, often paired with an inverted Carbon Ink (`#111315`) header and a Stone Index (`#EAE8E1`) footer.
- **Shadow Strategy:** Strictly flat (`box-shadow: none`). Hierarchy comes from the `1px` or `2px` solid `#111315` border.
- **Internal Padding:** `24px` (`p-6`) standard padding, or `20px` (`p-5`) inside compact dispatch headers and split index grids.

### Inputs / Fields
- **Style:** `40px` (`h-10`) height, `10px` (`rounded-md`) radius, `1px solid #111315` border on a Crisp Sheet (`#FFFFFF`) background with `14px` (`px-3.5 py-2`) horizontal padding and `#3D434D` placeholder text.
- **Focus:** `2px` solid Swiss Route Cobalt (`#0047BB`) focus ring (`focus-visible:ring-2 focus-visible:ring-[#0047BB]`).
- **Error / Disabled:** Native `:user-invalid` shifts the border to Signal Crimson (`#BA1C1C`); disabled fields drop to `50%` opacity with `cursor: not-allowed`.

### Tabs & Segmented Controls
- **Track (`TabsList`):** Recessed Stone Index (`#EAE8E1`) container with a `1px solid #111315` border, `12px` (`rounded-lg`) radius, and `4px` (`p-1`) padding.
- **Trigger (`TabsTrigger`):** `10px` (`rounded-md`) radius, `14px` horizontal and `6px` vertical padding (`px-3.5 py-1.5`), `12px`–`14px` semibold text. Active tab fills with solid Carbon Ink (`#111315`) and `#F5F4F0` text; inactive tabs sit on the stone track and hover to `rgba(255, 255, 255, 0.8)`.

### Navigation Header
- **Structure:** Sticky `64px` (`h-16`) top bar (`bg-background` `#F5F4F0`) anchored by a `2px solid #111315` bottom rule.
- **Brand Mark:** `32px × 32px` Vermilion square (`rounded-sm border border-[#111315]`) housing a solid lightning icon, paired with lowercase `Chivo` 900 `spike.land` logotype (`.land` in Vermilion) and a mono `MCP v2025` outline badge.
- **Controls:** Ghost navigation links with semantic colored icons (Vermilion Terminal, Emerald TrendingUp, Cobalt Plug), an outline `Cmd+K` quick-search trigger button, and a primary Vermilion `Join Waitlist` CTA. Collapses below `768px` (`md`) into a ruled dropdown drawer.

### Gateway Dispatch Schedule & `.mcp.json` Sheet (Signature Component)
- **Structure:** A composite `2px`-bordered `Card` combining three ruled zones: (1) an inverted `#111315` header displaying the suite title and a Vermilion `~502 TOKENS TOTAL` badge; (2) a zero-padding `Table` with a Stone (`#EAE8E1`) header row (`border-b border-[#111315]`) and `#C8C5BC`-ruled rows where tool names render in bold Cobalt mono (`#0047BB`) and token footprints render in right-aligned Emerald mono (`#0D7A5F`); and (3) a bottom-docked `#111315` inspection well (`border-t-2 border-[#111315]`) containing a `#1B1E23` `<pre>` block (`border-[#343942]`) with one-click clipboard copy feedback.

## Do's and Don'ts

### Do:
- **Do** frame every card, table, and section with exposed `1px` or `2px` solid Carbon Ink (`#111315`) hairlines against the Warm Alabaster Paper (`#F5F4F0`) canvas.
- **Do** enforce `font-mono` (`JetBrains Mono`) with `tabular-nums` on all token counts, latency metrics, dollar calculations, and MCP tool identifiers.
- **Do** lead metric index cells with the large tabular numeral on top and the concise semantic label underneath.
- **Do** keep protocol status badges (`Progressive Disclosure MCP`, `CLOUDFLARE V8 ISOLATES`, `-98.7% PROMPT OVERHEAD`) below the `<h1>` headline so the primary thesis commands the top of the visual hierarchy.
- **Do** use `min-w-0` and internal horizontal scroll (`overflow-x-auto`) on all JSON-RPC and `.mcp.json` code wells so mobile viewports (`375px`) never overflow horizontally.

### Don't:
- **Don't** introduce dark-mode page backgrounds, glowing neon gradients, aurora meshes, or translucent `backdrop-filter` glass cards anywhere in the system.
- **Don't** apply drop shadows (`box-shadow`) to cards, buttons, or inputs; rely on paper-tint contrast (`#F5F4F0` vs. `#EAE8E1` vs. `#FFFFFF`) and structural border weights.
- **Don't** use non-semantic accent colors; every highlight must map to SBB Signal Vermilion (`#E03C1F`), Swiss Route Cobalt (`#0047BB`), or Telemetry Emerald (`#0D7A5F`).
- **Don't** place protocol eyebrow pills above the hero `<h1>` or lead metric cards with small uppercase labels above the number.
