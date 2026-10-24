"use client";

import { useState, useEffect, useCallback } from "react";
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
  PlugZap,
  Settings,
  MessageSquare,
  LogOut,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  authenticatedFetch,
  getClientBearerToken,
  clearClientBearerToken,
  BEARER_TOKEN_CHANGED_EVENT,
} from "@/lib/auth/client-token";
import { useAuth } from "@workos-inc/authkit-react";

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

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

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const workosAuth = useSafeAuth();

  // Authentication status check
  useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      try {
        const res = await authenticatedFetch("/api/auth/session", {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = (await res.json()) as { authenticated?: boolean; user?: unknown };
          if (isMounted && data.authenticated && data.user) {
            setIsAuthenticated(true);
            return;
          }
        }
      } catch {
        // Ignore network errors during session check
      }

      if (!isMounted) return;

      if (getClientBearerToken()) {
        setIsAuthenticated(true);
        return;
      }

      if (workosAuth?.user) {
        setIsAuthenticated(true);
        return;
      }

      setIsAuthenticated(false);
    };

    runCheck();

    const handleTokenChange = () => {
      runCheck();
    };

    window.addEventListener(BEARER_TOKEN_CHANGED_EVENT, handleTokenChange);
    return () => {
      isMounted = false;
      window.removeEventListener(BEARER_TOKEN_CHANGED_EVENT, handleTokenChange);
    };
  }, [workosAuth?.user]);

  // Sign out / Log out handler
  const handleLogOut = async () => {
    try {
      clearClientBearerToken();
      await fetch("/api/auth/signout", { method: "POST" });
    } catch (err) {
      console.error("Signout error:", err);
    }

    try {
      if (workosAuth?.signOut) {
        await workosAuth.signOut();
      }
    } catch (err) {
      console.error("WorkOS signOut error:", err);
    }

    setIsAuthenticated(false);
    window.location.href = "/";
  };

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

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
      <div className="mx-auto max-w-7xl px-3 sm:px-4 xl:border-x-2 xl:border-[#111315]">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4 flex-nowrap">
          {/* Brand Identity Cell */}
          <div className="flex items-center gap-2.5 sm:gap-3 pr-2 sm:pr-4 lg:pr-6 shrink-0 lg:border-r-2 lg:border-[#111315]">
            <a className="flex items-center gap-2 sm:gap-2.5 group shrink-0" href="/">
              <div
                className="inline-flex items-center gap-2 sm:gap-2.5 shrink-0"
                role="img"
                aria-label="Spike Land logo"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground border border-[#111315] shrink-0">
                  <Zap className="h-4 w-4 fill-current shrink-0" />
                </span>
                <span className="font-display font-black tracking-tight lowercase text-lg sm:text-xl text-foreground whitespace-nowrap">
                  spike<span className="text-primary">.land</span>
                </span>
              </div>
            </a>
            <Badge
              variant="cobalt"
              className="hidden 2xl:inline-flex font-mono text-[11px] whitespace-nowrap shrink-0"
            >
              MCP 2026-07-28
            </Badge>
          </div>

          {/* Desktop Navigation Links Cell: Clean typography, uncluttered, icons never collide */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-1 pl-2 xl:pl-6 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 font-medium text-xs xl:text-sm text-foreground/80 hover:text-foreground"
            >
              <a href="/#how-it-works">Docs</a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 font-medium text-xs xl:text-sm text-foreground/80 hover:text-foreground"
            >
              <a href="/#playground">Playground</a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 font-medium text-xs xl:text-sm text-foreground/80 hover:text-foreground"
            >
              <a href="/blog">Blog</a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 font-medium text-xs xl:text-sm text-foreground/80 hover:text-foreground"
            >
              <a href="/#simulator" aria-label="ROI Simulator">
                <span className="hidden xl:inline">ROI </span>Simulator
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 font-medium text-xs xl:text-sm text-foreground/80 hover:text-foreground"
            >
              <a href="/#get-connected" aria-label="Setup Guide">
                <span className="hidden xl:inline">Setup </span>Guide
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 font-medium text-xs xl:text-sm text-foreground/80 hover:text-foreground"
            >
              <a href="/chat">Chat</a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 font-medium text-xs xl:text-sm text-foreground/80 hover:text-foreground"
            >
              <a href="/settings">Settings</a>
            </Button>
          </nav>

          {/* Action Cell: Quick Search, GitHub, Join Waitlist / Log Out, Mobile Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Search Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearchClick}
              aria-label="Search tools"
              className="gap-2 bg-card border-[#111315] h-9 px-2.5 sm:px-3 text-xs sm:text-sm shrink-0 whitespace-nowrap hidden sm:inline-flex lg:inline-flex"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="hidden xl:inline text-muted-foreground font-normal">
                Search tools...
              </span>
              <kbd className="hidden lg:inline-flex h-5 items-center rounded-sm border border-[#C8C5BC] bg-secondary px-1.5 font-mono text-[10px] font-semibold text-foreground shrink-0">
                Cmd+K
              </kbd>
            </Button>

            {/* GitHub Link */}
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hidden sm:inline-flex h-9 w-9 shrink-0 text-foreground"
            >
              <a
                href="https://github.com/zerdos/spike-vinext"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <GithubIcon className="h-4 w-4 shrink-0" />
              </a>
            </Button>

            {/* Subtle Divider for desktop actions */}
            <div
              className="hidden sm:block h-6 w-[2px] bg-[#111315] mx-0.5 sm:mx-1 shrink-0"
              aria-hidden="true"
            />

            {/* Primary Action: Join Waitlist (Logged out) OR Log Out (Logged in) */}
            {isAuthenticated ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogOut}
                aria-label="Log out"
                className="h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold shrink-0 gap-1.5 whitespace-nowrap border-[#111315] hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span>Log Out</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                asChild
                className="h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold shrink-0 gap-1.5 whitespace-nowrap"
              >
                <a href="/waitlist">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden min-[360px]:inline">Join Waitlist</span>
                  <span className="min-[360px]:hidden">Waitlist</span>
                </a>
              </Button>
            )}

            {/* Mobile / Tablet Menu Button (< lg) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className="lg:hidden h-9 w-9 bg-card border-[#111315] shrink-0 ml-0.5"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              ) : (
                <Menu className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile & Tablet Navigation Drawer (< lg) */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="lg:hidden py-4 border-t-2 border-[#111315] flex flex-col gap-1 bg-background max-h-[calc(100dvh-4rem)] overflow-y-auto"
          >
            {/* Quick search inside mobile drawer */}
            <div className="pb-3 border-b border-[#C8C5BC] mb-1">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-card border-[#111315] text-muted-foreground font-normal h-10 px-3"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSearchClick();
                }}
              >
                <span className="flex items-center gap-2 shrink-0">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">Search 455 tools...</span>
                </span>
                <kbd className="h-5 items-center rounded-sm border border-[#C8C5BC] bg-secondary px-1.5 font-mono text-[10px] font-semibold text-foreground inline-flex shrink-0">
                  Cmd+K
                </kbd>
              </Button>
            </div>

            {/* Navigation Links in Mobile Drawer */}
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#mount">
                <PlugZap className="h-4 w-4 text-primary shrink-0" />
                <span>Add a server</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#how-it-works">
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>Docs</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#playground">
                <Terminal className="h-4 w-4 text-primary shrink-0" />
                <span>Playground</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/blog">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span>Blog</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#simulator">
                <TrendingUp className="h-4 w-4 text-[#0D7A5F] shrink-0" />
                <span>ROI Simulator</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/#get-connected">
                <Plug className="h-4 w-4 text-[#0047BB] shrink-0" />
                <span>Setup Guide</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/chat">
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                <span>Chat</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a href="/settings">
                <Settings className="h-4 w-4 shrink-0" />
                <span>Settings</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2.5 h-10 text-sm font-medium"
              asChild
              onClick={() => setMobileMenuOpen(false)}
            >
              <a
                href="https://github.com/zerdos/spike-vinext"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="h-4 w-4 shrink-0" />
                <span>GitHub</span>
              </a>
            </Button>

            {/* Primary Action in Mobile Drawer */}
            <div className="pt-3 border-t border-[#C8C5BC] mt-2">
              {isAuthenticated ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center h-10 font-semibold gap-2 border-[#111315] hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogOut();
                  }}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Log Out</span>
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="w-full justify-center h-10 font-semibold gap-2"
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <a href="/waitlist">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>Join Waitlist</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}