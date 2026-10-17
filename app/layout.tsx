import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/client-layout";

export const metadata: Metadata = {
  title: "MCP Server - Spike Land",
  description:
    "455 AI tools with Progressive Context Disclosure. Connect your AI agent to spike.land's MCP server.",
  keywords: [
    "Spike Land",
    "MCP",
    "Model Context Protocol",
    "AI development platform",
    "AI agents",
    "coding agents",
    "context engineering",
    "Cloudflare Workers",
    "vinext",
  ],
  authors: [{ name: "Zoltan Erdos" }],
  openGraph: {
    title: "MCP Server - Spike Land",
    description:
      "455 AI tools with Progressive Context Disclosure. Connect your AI agent to spike.land's MCP server.",
    url: "https://spike.land/mcp",
    siteName: "Spike Land",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Server - Spike Land",
    description:
      "455 AI tools with Progressive Context Disclosure. Connect your AI agent to spike.land's MCP server.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
