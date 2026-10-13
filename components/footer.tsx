"use client";

import { useState } from "react";
import { Zap, Check } from "lucide-react";

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
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-7xl">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Newsletter */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 fill-cyan-400 text-cyan-400" />
              <h3 className="text-xl font-bold tracking-tight text-white">Spike Land</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              Open-source AI development platform powered by progressive context disclosure and edge runtimes.
            </p>

            <div className="pt-2">
              <h4 className="text-sm font-semibold text-white mb-1.5">Subscribe to updates</h4>
              <p className="text-xs text-zinc-400 mb-3">
                Get developer updates, new tools, and platform news.
              </p>
              <form onSubmit={handleSubmit} className="flex w-full max-w-sm items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-semibold px-4 h-10 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0"
                >
                  {subscribed ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Column: Developers */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Developers</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#docs">
                  Docs
                </a>
              </li>
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#playground">
                  MCP Tools
                </a>
              </li>
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#categories">
                  App Store
                </a>
              </li>
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#categories">
                  Skills
                </a>
              </li>
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="/api/hello">
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Company */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#about">
                  Blog
                </a>
              </li>
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#about">
                  About
                </a>
              </li>
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#pricing">
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/zerdos/spike.land"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#privacy">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="hover:text-cyan-400 transition-colors" href="#terms">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-zinc-500">
          <p>© 2026 Spike Land. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
