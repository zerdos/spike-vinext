"use client";

import { useState } from "react";
import { Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail("");
      setSubscribed(false);
    }, 3000);
  };

  return (
    <footer className="bg-card border-t-2 border-[#111315]">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Newsletter */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground border border-[#111315]">
                <Zap className="h-4 w-4 fill-current" />
              </span>
              <h3 className="font-display text-xl font-black tracking-tight text-foreground">
                Spike Land
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              MCP 2026-07-28 Stateless Progressive-Disclosure Relay &amp; Zero-Trust Governance Control Plane on Cloudflare Workers.
            </p>

            <div className="pt-2">
              <h4 className="text-sm font-bold text-foreground mb-1">
                Subscribe to updates
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Get developer updates, new tools, and platform news.
              </p>
              <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-sm items-center gap-2"
              >
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="h-10 text-xs"
                />
                <Button type="submit" variant="default" className="shrink-0">
                  {subscribed ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Column: Developers */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Developers</h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li>
                <a className="hover:text-primary transition-colors" href="/#how-it-works">
                  Architecture (SEP-2567)
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="/#playground">
                  MCP 2026 Playground
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="/#categories">
                  Capability Packs
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="/.well-known/oauth-protected-resource">
                  RFC 9728 Metadata
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="/api/mcp">
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Company */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Company</h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li>
                <a className="hover:text-primary transition-colors" href="/waitlist">
                  Waitlist
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="/#simulator">
                  Unit Economics
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="/auth/signin">
                  Sign In
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/zerdos/spike.land"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Legal</h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li>
                <a className="hover:text-primary transition-colors" href="#privacy">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#terms">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 Spike Land. All rights reserved.</p>
          <p className="font-mono">
            MCP 2026-07-28 STATELESS • CLOUDFLARE WORKERS V8 ISOLATES
          </p>
        </div>
      </div>
    </footer>
  );
}
