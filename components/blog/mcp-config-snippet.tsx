"use client";

import { useState } from "react";
import { Check, Copy, Terminal, FileCode, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const CONFIGS = [
  {
    id: "cursor",
    name: "Cursor (.cursor/mcp.json)",
    lang: "json",
    code: `{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["-y", "@spike-land/mcp-client@latest", "--gateway", "https://spike.land/api/mcp"]
    }
  }
}`,
  },
  {
    id: "claude",
    name: "Claude Desktop",
    lang: "json",
    code: `{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["-y", "@spike-land/mcp-client@latest", "--gateway", "https://spike.land/api/mcp"]
    }
  }
}`,
  },
  {
    id: "windsurf",
    name: "Windsurf",
    lang: "json",
    code: `{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["-y", "@spike-land/mcp-client@latest", "--gateway", "https://spike.land/api/mcp"]
    }
  }
}`,
  },
  {
    id: "cli",
    name: "Claude Code CLI",
    lang: "bash",
    code: `claude mcp add spike-land -- npx -y @spike-land/mcp-client@latest --gateway https://spike.land/api/mcp`,
  },
];

interface McpConfigSnippetProps {
  defaultClient?: "cursor" | "claude" | "windsurf" | "cli";
  title?: string;
}

export function McpConfigSnippet({
  defaultClient = "cursor",
  title = "Add Spike Land to Your AI Agent",
}: McpConfigSnippetProps) {
  const [activeTab, setActiveTab] = useState(defaultClient);
  const [copied, setCopied] = useState(false);

  const activeConfig = CONFIGS.find((c) => c.id === activeTab) || CONFIGS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeConfig.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-6 rounded-xl border border-border/70 bg-[#111315] text-[#F5F4F0] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-[#30363D] bg-[#1F2428] px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-primary" />
          <span className="font-semibold">{title}</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 text-xs text-[#C8C5BC] hover:text-[#F5F4F0] hover:bg-[#30363D]"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="border-b border-[#30363D] px-2 pt-1 bg-[#161B22]">
          <TabsList className="bg-transparent border-none h-8 gap-1">
            {CONFIGS.map((cfg) => (
              <TabsTrigger
                key={cfg.id}
                value={cfg.id}
                className="text-[11px] font-mono data-[state=active]:bg-[#1F2428] data-[state=active]:text-primary"
              >
                {cfg.id.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {CONFIGS.map((cfg) => (
          <TabsContent key={cfg.id} value={cfg.id} className="m-0 p-4">
            <pre className="text-xs font-mono leading-relaxed overflow-x-auto text-[#E6EDF3]">
              <code>{cfg.code}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
