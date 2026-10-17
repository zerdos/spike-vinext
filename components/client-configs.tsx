"use client";

import { useState } from "react";
import { CLIENT_CONFIGS } from "@/lib/mcp-data";
import {
  Settings,
  Terminal,
  Code,
  Globe,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const CLIENT_ICONS: Record<string, React.ElementType> = {
  settings: Settings,
  terminal: Terminal,
  code: Code,
  globe: Globe,
};

export function ClientConfigs() {
  const [activeTabId, setActiveTabId] = useState(CLIENT_CONFIGS[0].id);
  const [copied, setCopied] = useState(false);

  const activeConfig =
    CLIENT_CONFIGS.find((c) => c.id === activeTabId) || CLIENT_CONFIGS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeConfig.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <section
      id="get-connected"
      className="py-16 sm:py-24 border-b-2 border-[#111315] bg-secondary/30 scroll-mt-16"
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="space-y-3 mb-10 pb-6 border-b border-[#111315]">
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.02]">
            Get Connected
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-[65ch]">
            Connect Spike Land to Claude Desktop, Cursor, Claude Code, or any other AI app in seconds. Just copy the snippet below into your setup.
          </p>
        </div>

        {/* shadcn Tabs */}
        <Tabs
          value={activeTabId}
          onValueChange={(val) => {
            setActiveTabId(val);
            setCopied(false);
          }}
        >
          <div className="mb-6 overflow-x-auto pb-1">
            <TabsList className="h-auto p-1.5 gap-1.5 bg-card border-2 border-[#111315]">
              {CLIENT_CONFIGS.map((config) => {
                const Icon = CLIENT_ICONS[config.icon] || Terminal;
                return (
                  <TabsTrigger
                    key={config.id}
                    value={config.id}
                    className="px-4 py-2"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Code Card */}
          <Card className="border-2 border-[#111315] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#111315] bg-[#111315] text-[#F5F4F0] px-5 py-3.5 space-y-0">
              <div className="flex items-center gap-2.5">
                <Badge variant="default" className="font-mono text-[10px]">
                  CONFIG
                </Badge>
                <CardTitle className="font-mono text-xs font-semibold text-[#F5F4F0]">
                  {activeConfig.filename}
                </CardTitle>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2.5 text-xs font-mono"
                aria-label="Copy config snippet"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#0D7A5F]" />
                    <span className="text-[#0D7A5F]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </CardHeader>

            <CardContent className="p-5 bg-[#181B20] font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed">
              <pre className="text-[#F5F4F0]">
                <code>{activeConfig.code}</code>
              </pre>
            </CardContent>

            <CardFooter className="bg-card px-5 py-3 border-t border-[#111315] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Need early access or an API key?
              </span>
              <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs">
                <a href="/waitlist">
                  <span>Join the early access waitlist</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </CardFooter>
          </Card>
        </Tabs>
      </div>
    </section>
  );
}
