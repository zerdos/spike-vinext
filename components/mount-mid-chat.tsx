"use client";

import { useState } from "react";
import {
  ArrowRight,
  KeyRound,
  Laptop,
  MessageSquare,
  PlugZap,
  Play,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Walkthrough of a runtime mount: the agent connects a remote MCP server in the
 * middle of a conversation, without the client restarting or its tools/list changing.
 * Token figures are illustrative, based on a 14-tool Postgres server.
 */

interface MountStep {
  id: string;
  label: string;
  tool: string | null;
  icon: React.ElementType;
  summary: string;
  behindTheScenes: string;
  sent: string;
  received: string;
  tokens: number;
}

const MOUNT_STEPS: MountStep[] = [
  {
    id: "ask",
    label: "You ask",
    tool: null,
    icon: MessageSquare,
    summary: "You type a normal request. Nothing to install, nothing to restart.",
    behindTheScenes:
      "Your agent already has Spike Land's six tools, so it knows it can connect new servers by itself.",
    sent: `Connect to our staging Postgres MCP server at
https://db-mcp.internal.example.com/mcp
and show me the schema of the users table.`,
    received: `(no tool call yet, the agent is planning)`,
    tokens: 0,
  },
  {
    id: "mount",
    label: "It plugs the server in",
    tool: "mount_mcp_server",
    icon: PlugZap,
    summary: "The agent asks Spike Land to connect. It gets back a short note, not 14 tool descriptions.",
    behindTheScenes:
      "Our edge does the MCP handshake with your server, saves all 14 tool descriptions to this chat's session, and files them under a pg.* prefix. None of that goes through the model.",
    sent: `{
  "name": "mount_mcp_server",
  "arguments": {
    "url": "https://db-mcp.internal.example.com/mcp",
    "prefix": "pg",
    "authSecretRef": "vault:STAGING_DB_TOKEN"
  }
}`,
    received: `Mounted "postgres-mcp" as pg (14 tools).
Most useful: pg.query, pg.describe_table,
pg.list_schemas. Use inspect_tool_schema to
read one, or execute_tool to run it.`,
    tokens: 80,
  },
  {
    id: "inspect",
    label: "It looks up one tool",
    tool: "inspect_tool_schema",
    icon: Search,
    summary: "The agent reads the instructions for the one tool it needs, and skips the other 13.",
    behindTheScenes:
      "The same lookup searches our 455 built-in tools and anything you've mounted in this chat, so the agent doesn't have to care where a tool lives.",
    sent: `{
  "name": "inspect_tool_schema",
  "arguments": { "tool_name": "pg.describe_table" }
}`,
    received: `{
  "name": "pg.describe_table",
  "description": "Columns, types and indexes for a table",
  "inputSchema": {
    "type": "object",
    "properties": {
      "table":  { "type": "string" },
      "schema": { "type": "string", "default": "public" }
    },
    "required": ["table"]
  }
}`,
    tokens: 110,
  },
  {
    id: "run",
    label: "It runs it",
    tool: "execute_tool",
    icon: Play,
    summary: "The agent runs the tool through the same execute_tool it uses for everything else.",
    behindTheScenes:
      "Spike Land sees the pg.* prefix, fetches your saved token from the vault, and forwards the call to your server. The model never sees the token.",
    sent: `{
  "name": "execute_tool",
  "arguments": {
    "tool_name": "pg.describe_table",
    "arguments": { "table": "users" }
  }
}`,
    received: `users (public)
  id          uuid         primary key
  email       text         unique, not null
  created_at  timestamptz  default now()
  plan        text         default 'free'`,
    tokens: 64,
  },
];

const SCHEMAS_IN_SERVER = 14;
const TOKENS_PER_SCHEMA = 110;
const UPFRONT_COST = SCHEMAS_IN_SERVER * TOKENS_PER_SCHEMA;

const ADD_A_SERVER_COMPARISON = [
  {
    approach: "Edit .mcp.json and restart your editor",
    works: "Everywhere, but you lose your place in the chat",
    cost: "All 14 tool descriptions, in every message, for the rest of the chat",
    highlight: false,
  },
  {
    approach: "Push a tool-list update to the client mid-chat",
    works: "Patchy. Many editors ignore it until you hit refresh",
    cost: "Same as above once it lands, and your AI provider's cache resets",
    highlight: false,
  },
  {
    approach: "Spike Land: mount it through the tools you already have",
    works: "Every MCP client, because your tool list never changes",
    cost: "One short note, plus the one tool description the agent asks for",
    highlight: true,
  },
];

export interface MountMidChatProps {
  highlightStep?: 1 | 2 | 3;
  embedded?: boolean;
}

export function MountMidChat({ highlightStep, embedded = false }: MountMidChatProps = {}) {
  const initialStep = highlightStep ? Math.max(0, Math.min(2, highlightStep - 1)) : 1;
  const [active, setActive] = useState(initialStep);
  const step = MOUNT_STEPS[active];
  const tokensSoFar = MOUNT_STEPS.slice(0, active + 1).reduce((sum, s) => sum + s.tokens, 0);
  const isLast = active === MOUNT_STEPS.length - 1;

  if (embedded) {
    return (
      <div className="my-8 rounded-xl border-2 border-[#111315] bg-card overflow-hidden shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111315] bg-[#111315] px-4 py-2.5 text-[#F5F4F0]">
          <div className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-display text-sm font-bold">
              Mid-Chat Server Mount Walkthrough
            </span>
          </div>
          <span className="font-mono text-[10px] text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
            Interactive Component • Live Edge Sandbox
          </span>
        </div>
        <div className="p-2 sm:p-4 bg-secondary/20">
          <Card className="border border-border/60 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x-2 lg:divide-border/60">
              {/* Step list */}
              <div className="lg:col-span-5 min-w-0 border-b lg:border-b-0 border-border/60 bg-secondary/40">
                <ol className="divide-y divide-border/40" aria-label="Mounting walkthrough">
                  {MOUNT_STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = i === active;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setActive(i)}
                          aria-pressed={isActive}
                          className={`w-full text-left px-4 py-3 flex gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                            isActive ? "bg-card" : "bg-secondary/40 hover:bg-card/70"
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border font-mono text-xs font-bold ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border/60 text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-foreground truncate">
                                {s.label}
                              </span>
                              {s.tool && (
                                <code className="font-mono text-[10px] text-primary bg-primary/10 px-1 rounded">
                                  {s.tool}
                                </code>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {s.summary}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Step details */}
              <div className="lg:col-span-7 p-4 bg-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      Step {active + 1} of 3
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      +{step.tokens} prompt tokens
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground mb-3 leading-relaxed">
                    {step.behindTheScenes}
                  </p>
                  <div className="space-y-2">
                    <div className="rounded bg-[#111315] p-2 text-[11px] font-mono text-[#F5F4F0] overflow-x-auto">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Sent</div>
                      <pre className="whitespace-pre-wrap">{step.sent}</pre>
                    </div>
                    <div className="rounded bg-[#111315] p-2 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Received</div>
                      <pre className="whitespace-pre-wrap">{step.received}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <section
      id="mount"
      className="scroll-mt-16 py-16 sm:py-24 border-b-2 border-[#111315] bg-secondary/40"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 pb-6 border-b border-[#111315] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.02] balance">
              Your agent plugs in the server and keeps working
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-[65ch]">
              As far as Cursor or Claude Code can tell, nothing changes. They still see the same six tools.
              Spike Land handles the new server behind those tools, so your agent can connect it, look up a
              tool and run it in three calls, all in the same chat.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <Badge variant="default">In preview</Badge>
              <Badge variant="outline" className="font-mono">
                Remote HTTP and SSE servers
              </Badge>
            </div>
          </div>
          <Button size="lg" variant="outline" asChild className="self-start lg:self-end">
            <a href="/waitlist">
              Get preview access
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Walkthrough instrument */}
        <Card className="border-2 border-[#111315] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x-2 lg:divide-[#111315]">
            {/* Step list */}
            <div className="lg:col-span-5 min-w-0 border-b-2 lg:border-b-0 border-[#111315] bg-secondary/40">
              <div className="bg-[#111315] text-[#F5F4F0] px-5 py-4 flex items-center justify-between gap-2">
                <span className="font-display text-base font-bold">One chat, start to finish</span>
                <span className="font-mono text-[10px] text-[#B8BDC7]">EXAMPLE</span>
              </div>
              <ol className="divide-y divide-[#C8C5BC]" aria-label="Mounting walkthrough">
                {MOUNT_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = i === active;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActive(i)}
                        aria-pressed={isActive}
                        className={`w-full text-left px-5 py-4 flex gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0047BB] ${
                          isActive ? "bg-card" : "bg-secondary/40 hover:bg-card/70"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border ${
                            isActive
                              ? "bg-primary border-[#111315] text-white"
                              : "bg-card border-[#C8C5BC] text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 space-y-1">
                          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-bold text-foreground">{s.label}</span>
                            {s.tool && (
                              <span className="font-mono text-[11px] font-semibold text-[#0047BB]">
                                {s.tool}
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-muted-foreground leading-relaxed">
                            {s.summary}
                          </span>
                        </span>
                        <span className="ml-auto pl-2 shrink-0 font-mono text-[11px] font-semibold text-[#0D7A5F] tabular-nums">
                          {s.tokens > 0 ? `+${s.tokens} tok` : "–"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Wire view */}
            <div className="lg:col-span-7 min-w-0 bg-[#111315] text-[#F5F4F0] flex flex-col">
              <div key={step.id} className="animate-dispatch-flap p-4 sm:p-5 space-y-4 flex-1 min-w-0">
                <div className="min-w-0">
                  <div className="mb-2 font-mono text-[11px] font-semibold text-[#B8BDC7]">
                    {step.tool ? "Your agent sends" : "You type"}
                  </div>
                  <pre className="custom-scrollbar text-xs font-mono leading-relaxed overflow-x-auto p-3 rounded-md bg-[#1B1E23] border border-[#343942] text-[#F5F4F0]">
                    <code>{step.sent}</code>
                  </pre>
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[11px] font-semibold text-[#B8BDC7]">
                    <span>{step.tool ? "Spike Land replies" : "Spike Land"}</span>
                    {step.tokens > 0 && (
                      <span className="text-[#34D399]">~{step.tokens} tokens into the chat</span>
                    )}
                  </div>
                  <pre className="custom-scrollbar text-xs font-mono leading-relaxed overflow-x-auto p-3 rounded-md bg-[#1B1E23] border border-[#343942] text-[#F5F4F0]">
                    <code>{step.received}</code>
                  </pre>
                </div>
                <p className="text-sm leading-relaxed text-[#B8BDC7] max-w-[65ch]">
                  <span className="font-semibold text-[#F5F4F0]">Behind the scenes: </span>
                  {step.behindTheScenes}
                </p>
              </div>

              <div className="border-t-2 border-[#343942] bg-[#1B1E23] px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="font-mono text-[11px] leading-relaxed text-[#B8BDC7]">
                  <span className="text-[#34D399] font-semibold tabular-nums">~{tokensSoFar} tokens</span> so far,
                  vs <span className="text-[#F5F4F0] font-semibold tabular-nums">~{UPFRONT_COST.toLocaleString("en-US")}</span>{" "}
                  in every message if all {SCHEMAS_IN_SERVER} tool descriptions were loaded up front
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isLast ? "secondary" : "default"}
                  onClick={() => setActive(isLast ? 0 : active + 1)}
                >
                  {isLast ? "Start again" : "Next step"}
                  {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Why not just update the tool list? */}
        <Card className="mt-8 border-2 border-[#111315] overflow-hidden">
          <CardHeader className="bg-[#111315] text-[#F5F4F0] py-4 px-5">
            <CardTitle className="text-base font-bold text-[#F5F4F0]">
              Three ways to add a server halfway through a chat
            </CardTitle>
            <CardDescription className="text-xs text-[#B8BDC7] mt-0.5">
              Using the same 14-tool Postgres server as the example above
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">How you add it</TableHead>
                  <TableHead className="px-4">Where it works</TableHead>
                  <TableHead className="px-4">What it adds to your prompt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ADD_A_SERVER_COMPARISON.map((row) => (
                  <TableRow key={row.approach} className={row.highlight ? "bg-[#ECFDF5]" : undefined}>
                    <TableCell className="px-4 text-xs font-bold text-foreground">{row.approach}</TableCell>
                    <TableCell className="px-4 text-xs text-muted-foreground">{row.works}</TableCell>
                    <TableCell
                      className={`px-4 text-xs ${row.highlight ? "font-bold text-[#064E3B]" : "text-muted-foreground"}`}
                    >
                      {row.cost}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Honest limits */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 border-2 border-[#111315] rounded-xl overflow-hidden bg-card divide-y-2 md:divide-y-0 md:divide-x-2 divide-[#111315]">
          <div className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Laptop className="h-5 w-5 text-[#0047BB] shrink-0" />
              <h3 className="font-display text-lg font-bold text-foreground">
                Servers that only run on your laptop stay there
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[60ch]">
              A lot of servers in the registries start with{" "}
              <code className="text-xs text-foreground">npx</code> and run locally. Our edge can&apos;t
              start programs on your machine. If you ask for one of those, your agent says so and gives you
              the one-line config to add it yourself. It won&apos;t pretend it worked.
            </p>
          </div>
          <div className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-5 w-5 text-primary shrink-0" />
              <h3 className="font-display text-lg font-bold text-foreground">
                Your keys never go into the chat
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[60ch]">
              Pasting an API key into a prompt means it ends up in your AI provider&apos;s logs. Instead, save
              it once in{" "}
              <a href="/settings" className="font-semibold text-foreground underline decoration-primary decoration-2">
                Settings
              </a>
              . Your agent refers to it by name, like{" "}
              <code className="text-xs text-foreground">vault:GITHUB_TOKEN</code>, and we fill in the real
              value at the edge when we call the server.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
