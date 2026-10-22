"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Zap,
  Bot,
  User,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Shield,
  Layers,
  Lock,
  CodeXml,
  MessageSquare,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AuthUser } from "@/lib/auth/types";
import {
  getClientBearerToken,
  authenticatedFetch,
  BEARER_TOKEN_CHANGED_EVENT,
} from "@/lib/auth/client-token";
import { ChatMessage, ChatResponse } from "@/src/types";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  turns?: number;
}

const SUGGESTED_PROMPTS = [
  {
    title: "Mount GitHub MCP Server",
    prompt:
      "Mount the GitHub MCP server at https://mcp.github.com/mcp with namespace gh and discover tools for repository search.",
  },
  {
    title: "Discover Web Scraping Tools",
    prompt:
      "Discover all available tools related to web scraping, browser automation, and markdown extraction.",
  },
  {
    title: "Database Inspection",
    prompt:
      "Show me how to mount a database server and discover tools to inspect table schemas and foreign keys.",
  },
  {
    title: "Position-Zero Prompt Caching",
    prompt:
      "Explain how Spike Land position-zero prompt caching and the Meta-MCP gateway reduce token consumption by 98.7%.",
  },
];

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  return (
    <div className="my-2 rounded-md border-2 border-[#111315] bg-[#111315] text-[#F5F4F0] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1F2428] border-b border-[#30363D] text-[11px] font-mono">
        <span className="text-[#C8C5BC] uppercase font-semibold">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[#C8C5BC] hover:text-[#F5F4F0] transition-colors"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#0D7A5F]" />
              <span className="text-[#0D7A5F]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Split content by fenced code blocks (```lang ... ```)
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed break-words">
      {segments.map((segment, idx) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const inner = segment.slice(3, -3);
          const firstLineBreak = inner.indexOf("\n");
          let lang = "";
          let code = inner;
          if (firstLineBreak !== -1) {
            const firstLine = inner.slice(0, firstLineBreak).trim();
            if (/^[a-z0-9_-]+$/i.test(firstLine)) {
              lang = firstLine;
              code = inner.slice(firstLineBreak + 1);
            }
          }
          return <CodeBlock key={idx} code={code.trim()} language={lang} />;
        }

        if (!segment.trim()) return null;

        return (
          <p key={idx} className="whitespace-pre-wrap">
            {segment}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Chat conversation state
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSession, setCopiedSession] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Initialize a unique session ID
  const initSession = useCallback(() => {
    const newId = `sess_${crypto.randomUUID().slice(0, 12)}`;
    setSessionId(newId);
    setMessages([]);
    setError(null);
  }, []);

  // Check customer authentication
  const checkAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await authenticatedFetch("/api/auth/session", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          authenticated: boolean;
          user: AuthUser | null;
        };
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    initSession();

    const handleTokenChange = () => {
      checkAuth();
    };
    window.addEventListener(BEARER_TOKEN_CHANGED_EVENT, handleTokenChange);
    return () => {
      window.removeEventListener(BEARER_TOKEN_CHANGED_EVENT, handleTokenChange);
    };
  }, [checkAuth, initSession]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0 || isSubmitting) {
      if (typeof messagesEndRef.current?.scrollIntoView === "function") {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, isSubmitting]);

  // Copy session ID
  const handleCopySession = async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedSession(true);
      setTimeout(() => setCopiedSession(false), 2000);
    } catch {
      // Ignore
    }
  };

  // Copy message text
  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // Ignore
    }
  };

  // Send message to /api/chat
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputMessage;
    const text = rawText.trim();
    if (!text || isSubmitting) return;

    setError(null);

    const userMessageId = crypto.randomUUID();
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newUserMessage: DisplayMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      timestamp: now,
    };

    const nextMessages = [...messages, newUserMessage];
    setMessages(nextMessages);
    setInputMessage("");
    setIsSubmitting(true);

    try {
      // Format chat messages history for /api/chat
      const formattedHistory: ChatMessage[] = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await authenticatedFetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          messages: formattedHistory,
          message: text,
        }),
      });

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = (await response.json()) as {
            error?: string;
            details?: string;
          };
          if (errJson?.error) {
            errorDetail = errJson.details
              ? `${errJson.error} - ${errJson.details}`
              : errJson.error;
          }
        } catch {
          // Fall back to HTTP status
        }
        throw new Error(errorDetail);
      }

      const data = (await response.json()) as ChatResponse;

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "No response received.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        toolsUsed: data.toolsUsed,
        turns: data.turns,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errMsg =
        (err as Error)?.message || "Failed to communicate with /api/chat agent.";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Top Header & Breadcrumbs */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="gap-1.5 px-2">
                <a href="/">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-medium">Home</span>
                </a>
              </Button>
              <span className="text-muted-foreground text-sm">/</span>
              <span className="font-mono text-xs sm:text-sm text-foreground font-semibold">
                chat
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="cobalt" className="font-mono text-[11px]">
                AGENT HARNESS
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px] border-[#111315]">
                POST /api/chat
              </Badge>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-foreground flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground border border-[#111315] shrink-0">
                <MessageSquare className="h-4 w-4 fill-current" />
              </span>
              <span>Customer Agent Chat</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Direct access to the multi-turn Cloudflare Worker agent harness with runtime MCP server mounting and tool discovery.
            </p>
          </div>
        </div>

        {/* Auth Check State */}
        {authLoading ? (
          <Card className="border-2 border-[#111315] p-12 text-center shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="font-mono text-sm text-muted-foreground">
                Verifying customer authentication...
              </p>
            </div>
          </Card>
        ) : !user ? (
          /* Unauthenticated Customer Card */
          <Card className="border-2 border-[#111315] overflow-hidden shadow-xs">
            <CardHeader className="bg-secondary/60 border-b-2 border-[#111315] p-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg sm:text-xl font-bold font-display">
                    Authentication Required
                  </CardTitle>
                </div>
                <Badge variant="default" className="font-mono uppercase text-xs">
                  Customer Access Only
                </Badge>
              </div>
              <CardDescription className="text-sm mt-1">
                The Spike Land agent chat interface connects directly to the production <code className="font-mono font-semibold text-foreground">/api/chat</code> endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You are currently viewing this page as a guest. Please sign in with your customer account to start a conversation, mount custom MCP servers mid-chat, and inspect live schemas.
                </p>
                <div className="p-4 rounded-md border-2 border-[#111315] bg-secondary/30 text-xs font-mono text-muted-foreground space-y-1">
                  <div className="text-foreground font-semibold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Demo Account Credentials:</span>
                  </div>
                  <p>Username: <code className="text-foreground font-bold">admin@spike.land</code></p>
                  <p>Or sign in using Google SSO to create or link your customer account.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="default" size="lg" asChild className="font-bold">
                  <a href="/auth/signin?returnTo=/chat">
                    Sign In to Access Chat
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="/waitlist">
                    Join Waitlist
                  </a>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <a href="/#how-it-works">
                    Learn How It Works
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Authenticated Customer Chat Interface */
          <div className="space-y-4">
            {/* Session & Customer Status Bar */}
            <Card className="border-2 border-[#111315] overflow-hidden shadow-xs">
              <div className="p-3 sm:p-4 bg-card flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#111315]">
                {/* Left: Customer Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-sm bg-primary/10 border border-[#111315] flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-bold text-foreground truncate">
                        {user.email}
                      </span>
                      <Badge variant="emerald" className="font-mono text-[10px] uppercase">
                        {user.role || "customer"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>Authenticated via {user.provider || "credentials"}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Session controls */}
                <div className="flex items-center flex-wrap gap-2">
                  {/* Session ID Pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#111315] bg-secondary font-mono text-xs">
                    <span className="text-muted-foreground">Session:</span>
                    <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[160px]">
                      {sessionId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySession}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      title="Copy Session ID"
                      aria-label="Copy Session ID"
                    >
                      {copiedSession ? (
                        <Check className="w-3 h-3 text-[#0D7A5F]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Reset / New Session */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={initSession}
                    disabled={isSubmitting}
                    className="gap-1.5 h-8 font-mono text-xs border-[#111315]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
                    <span>New Session</span>
                  </Button>
                </div>
              </div>

              {/* Meta-MCP Gateway Badges */}
              <div className="px-3 sm:px-4 py-2 bg-secondary/40 text-xs font-mono text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  <span className="text-foreground font-semibold">Active Tools:</span>
                  <span className="text-muted-foreground">mount_mcp_server, discover_tools, run_tool</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Backed by Cloudflare KV • Max 5 steps / request
                </div>
              </div>
            </Card>

            {/* Chat Messages Feed */}
            <Card className="border-2 border-[#111315] overflow-hidden shadow-xs flex flex-col h-[540px] sm:h-[600px] bg-card">
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
                role="log"
                aria-live="polite"
                aria-label="Chat messages history"
              >
                {/* Empty State with Suggested Prompts */}
                {messages.length === 0 && (
                  <div className="h-full flex flex-col justify-center items-center text-center max-w-xl mx-auto py-8">
                    <div className="h-12 w-12 rounded-sm bg-primary/10 border-2 border-[#111315] flex items-center justify-center mb-4">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-lg sm:text-xl text-foreground">
                      Spike Land Agent Harness
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-md">
                      Start a multi-turn conversation with the agent. It can dynamically mount remote MCP servers, discover tool schemas, and execute commands on demand.
                    </p>

                    <div className="mt-6 w-full text-left space-y-2">
                      <div className="font-mono text-xs text-muted-foreground uppercase tracking-wide">
                        Suggested Prompts
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SUGGESTED_PROMPTS.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(item.prompt)}
                            disabled={isSubmitting}
                            className="p-3 text-left rounded-md border-2 border-[#111315] bg-secondary/50 hover:bg-secondary hover:border-primary transition-all text-xs font-mono group"
                          >
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                              <span>{item.title}</span>
                              <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="mt-1 text-muted-foreground line-clamp-2">
                              {item.prompt}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages stream */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground mb-1 px-1">
                      {msg.role === "user" ? (
                        <>
                          <span className="font-semibold text-foreground">You</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Spike Agent</span>
                          </span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                          {msg.turns !== undefined && msg.turns > 1 && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1 border-[#111315]">
                                {msg.turns} turns
                              </Badge>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <div
                      className={`relative group max-w-[90%] sm:max-w-[80%] rounded-md p-3.5 sm:p-4 border-2 border-[#111315] ${
                        msg.role === "user"
                          ? "bg-secondary text-foreground rounded-tr-none"
                          : "bg-card text-foreground rounded-tl-none shadow-xs"
                      }`}
                    >
                      <FormattedContent content={msg.content} />

                      {/* Tool Call Pills (if tools were used by assistant) */}
                      {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#C8C5BC] flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">
                            Tools Used:
                          </span>
                          {msg.toolsUsed.map((tool, tIdx) => (
                            <Badge
                              key={tIdx}
                              variant="ink"
                              className="font-mono text-[10px] px-1.5 py-0"
                            >
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Copy message button */}
                      {msg.role === "assistant" && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity p-1 bg-secondary rounded border border-[#111315]"
                          title="Copy message"
                          aria-label="Copy assistant message"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3 h-3 text-[#0D7A5F]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Submitting / Thinking Indicator */}
                {isSubmitting && (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground mb-1 px-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-current animate-pulse" />
                        <span>Spike Agent</span>
                      </span>
                      <span>•</span>
                      <span>running agent loop...</span>
                    </div>
                    <div className="rounded-md p-4 border-2 border-[#111315] bg-card rounded-tl-none flex items-center gap-3">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="font-mono text-xs text-muted-foreground animate-pulse">
                        Evaluating Meta-MCP tools &amp; generating response...
                      </span>
                    </div>
                  </div>
                )}

                {/* Inline Error Message */}
                {error && (
                  <Alert variant="destructive" className="border-2 border-[#111315]">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-mono text-xs font-bold">
                      Agent Execution Error
                    </AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      {error}
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendMessage()}
                          className="h-7 text-xs font-mono"
                        >
                          Retry Last Request
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input & Form Area */}
              <div className="p-3 sm:p-4 bg-secondary/30 border-t-2 border-[#111315]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="space-y-2"
                >
                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isSubmitting}
                      rows={2}
                      placeholder="Type a message or instruction for the agent... (Press Enter to send, Shift+Enter for newline)"
                      aria-label="Chat input message"
                      className="w-full resize-none rounded-md border-2 border-[#111315] bg-background px-3 py-2.5 text-xs sm:text-sm font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                    />
                    <div className="absolute right-2.5 bottom-3 flex items-center gap-1.5">
                      <Button
                        type="submit"
                        variant="default"
                        size="sm"
                        disabled={isSubmitting || !inputMessage.trim()}
                        className="h-8 px-3 font-semibold text-xs gap-1.5 shadow-xs"
                        aria-label="Send message"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Send</span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
                    <span className="hidden sm:inline">
                      Endpoint: <code className="text-foreground font-semibold">POST /api/chat</code>
                    </span>
                    <span>
                      Enter to send • Shift+Enter for newline
                    </span>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
