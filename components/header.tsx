"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  BookOpen,
  Terminal,
  Search,
  Menu,
  X,
  TrendingUp,
  Sparkles,
  Plug,
} from "lucide-react";

function GithubIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById("tool-search-input");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        } else {
          window.location.href = "/#playground";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchClick = () => {
    const el = document.getElementById("tool-search-input");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    } else {
      window.location.href = "/#playground";
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0e14]/85 backdrop-blur-md border-b border-white/[0.08]">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a className="flex items-center gap-2 group" href="/">
            <div className="inline-flex items-center gap-2" role="img" aria-label="Spike Land logo">
              <Zap className="h-6 w-6 fill-cyan-400 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold tracking-tight lowercase text-xl text-white">
                spike<span className="text-cyan-400">.land</span>
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            <a
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
              href="/#how-it-works"
            >
              <BookOpen className="h-4 w-4" />
              Docs
            </a>
            <a
              className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              href="/#playground"
            >
              <Terminal className="h-4 w-4" />
              Playground
            </a>
            <a
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
              href="/#simulator"
            >
              <TrendingUp className="h-4 w-4" />
              ROI Simulator
            </a>
            <a
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
              href="/#get-connected"
            >
              <Plug className="h-4 w-4 text-cyan-400" />
              Setup Guide
            </a>

            {/* Quick Search */}
            <button
              type="button"
              onClick={handleSearchClick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
              aria-label="Search tools"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Search tools...</span>
              <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-white/10 bg-white/10 px-1.5 font-mono text-[10px]">
                Cmd+K
              </kbd>
            </button>

            {/* GitHub */}
            <a
              href="https://github.com/zerdos/spike.land"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <GithubIcon className="h-5 w-5" />
            </a>

            {/* Actions: Replaced Sign In with Join Waiting List */}
            <a
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-300 active:scale-[0.98] bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110"
              href="/waitlist"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Join Waitlist
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 flex flex-col gap-3">
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-white/5"
            >
              <BookOpen className="h-4 w-4" />
              Docs
            </a>
            <a
              href="/#playground"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-cyan-400 hover:bg-white/5"
            >
              <Terminal className="h-4 w-4" />
              Playground
            </a>
            <a
              href="/#simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-emerald-400 hover:bg-white/5"
            >
              <TrendingUp className="h-4 w-4" />
              ROI Simulator
            </a>
            <a
              href="/#get-connected"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-white/5"
            >
              <Plug className="h-4 w-4 text-cyan-400" />
              Setup Guide
            </a>
            <a
              href="https://github.com/zerdos/spike.land"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-white/5"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
            <div className="pt-2">
              <a
                href="/waitlist"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 text-center py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white shadow-lg"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Join Waiting List
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
