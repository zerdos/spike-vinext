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
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@workos-inc/authkit-react";

function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
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

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return {
      user: null,
      isLoading: false,
      signIn: () => {
        window.location.href = "/login";
      },
      signOut: () => {},
    };
  }
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signIn, signOut, isLoading } = useSafeAuth();

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
    <header className="sticky top-0 z-50 w-full bg-background border-b-2 border-[#111315]">
      <div className="mx-auto max-w-7xl px-4 xl:border-x-2 xl:border-[#111315]">
        <div className="flex h-16 items-stretch justify-between">
          {/* Brand Identity Cell */}
          <div className="flex items-center gap-3 pr-4 md:pr-6 md:border-r-2 md:border-[#111315]">
            <a className="flex items-center gap-2.5 group" href="/">
              <div
                className="inline-flex items-center gap-2.5"
                role="img"
                aria-label="Spike Land logo"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground border border-[#111315]">
                  <Zap className="h-4 w-4 fill-current" />
                </span>
                <span className="font-display font-black tracking-tight lowercase text-xl text-foreground">
                  spike<span className="text-primary">.land</span>
                </span>
              </div>
            </a>
            <Badge variant="cobalt" className="hidden sm:inline-flex font-mono text-[11px]">
              MCP 2026-07-28
            </Badge>
          </div>

          {/* Desktop Navigation Cell */}
          <nav className="hidden md:flex flex-1 items-center justify-between pl-4 lg:pl-6">
            <div className="flex items-center gap-1 lg:gap-1.5">
              <Button variant="ghost" size="sm" asChild>
                <a href="/#how-it-works">
                  <BookOpen className="h-4 w-4" />
                  Docs
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="/#playground">
                  <Terminal className="h-4 w-4 text-primary" />
                  Playground
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="/#simulator">
                  <TrendingUp className="h-4 w-4 text-[#0D7A5F]" />
                  ROI Simulator
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="/#get-connected">
                  <Plug className="h-4 w-4 text-[#0047BB]" />
                  Setup Guide
                </a>
              </Button>
            </div>

            <div className="flex items-stretch h-full">
              <div className="flex items-center gap-1.5 pr-4 border-r-2 border-[#111315]">
                {/* Quick Search */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSearchClick}
                  aria-label="Search tools"
                  className="gap-2 bg-card"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden lg:inline text-muted-foreground font-normal">
                    Search tools...
                  </span>
                  <kbd className="hidden lg:inline-flex h-5 items-center rounded-sm border border-[#C8C5BC] bg-secondary px-1.5 font-mono text-[10px] font-semibold text-foreground">
                    Cmd+K
                  </kbd>
                </Button>

                {/* GitHub */}
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href="https://github.com/zerdos/spike-vinext"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                  >
                    <GithubIcon className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              {/* Primary Action Cell: Auth */}
              <div className="flex items-center pl-4 gap-2">
                {isLoading ? (
                  <div className="h-8 w-20 animate-pulse bg-muted rounded" />
                ) : user ? (
                  <>
                    <span className="text-sm text-muted-foreground hidden lg:inline">
                      {user.firstName ?? user.email}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => signOut()}>
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button variant="default" size="sm" onClick={() => signIn()}>
                    <LogIn className="h-3.5 w-3.5" />
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#111315] flex flex-col gap-2 bg-background">
            <Button
              variant="ghost"
              className="justify-start"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#how-it-works">
                <BookOpen className="h-4 w-4" />
                Docs
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#playground">
                <Terminal className="h-4 w-4 text-primary" />
                Playground
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#simulator">
                <TrendingUp className="h-4 w-4 text-[#0D7A5F]" />
                ROI Simulator
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#get-connected">
                <Plug className="h-4 w-4 text-[#0047BB]" />
                Setup Guide
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a
                href="https://github.com/zerdos/spike-vinext"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="h-4 w-4" />
                GitHub
              </a>
            </Button>
            <div className="pt-2">
              {isLoading ? (
                <div className="h-10 w-full animate-pulse bg-muted rounded" />
              ) : user ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {user.firstName ?? user.email}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signIn();
                  }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
