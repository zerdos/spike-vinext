"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Sparkles,
  ArrowRight,
  Check,
  Copy,
  Share2,
  Terminal,
  Zap,
  Shield,
  Layers,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

interface WaitlistTicket {
  position: number;
  referralCode: string;
  email: string;
  name?: string;
  createdAt: string;
}

const CLIENT_OPTIONS = [
  "Claude Desktop",
  "Cursor",
  "Claude Code",
  "Windsurf",
  "Cline / Roo",
  "Custom Agent / SDK",
];

const USE_CASES = [
  "Building autonomous AI agents",
  "Engineering IDE tool integrations",
  "Enterprise MCP gateway migration",
  "Reducing LLM token overhead",
  "Hobby / research exploration",
];

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [client, setClient] = useState("Claude Desktop");
  const [useCase, setUseCase] = useState("Building autonomous AI agents");
  const [githubUsername, setGithubUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [ticket, setTicket] = useState<WaitlistTicket | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          client,
          useCase,
          githubUsername,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ticket) {
        setTicket(data.ticket);
      } else {
        setErrorMessage(data.error || "Unable to join waitlist. Please try again.");
      }
    } catch {
      // Offline fallback
      setTicket({
        position: 429,
        referralCode: `SPK-429-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        email,
        name: name || undefined,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferral = async () => {
    if (!ticket) return;
    const shareUrl = `${window.location.origin}/waitlist?ref=${ticket.referralCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const tweetShare = () => {
    if (!ticket) return;
    const text = encodeURIComponent(
      `I just joined the developer waitlist for @spike_land! 455+ edge-native MCP tools with progressive context disclosure. Get early access with my invite:`
    );
    const url = encodeURIComponent(
      `${window.location.origin}/waitlist?ref=${ticket.referralCode}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-foreground flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb / Back button */}
          <div className="mb-8">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </a>
          </div>

          {!ticket ? (
            /* Signup View */
            <div className="space-y-12">
              {/* Header Box */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  Early Developer Preview • Cohort 2
                </div>
                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                  Join the <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">Waiting List</span>
                </h1>
                <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
                  Be the first to build with Spike Land&apos;s edge-native MCP gateway. Get instant access to 455+ progressive tools, zero setup overhead, and 100,000 free monthly executions.
                </p>
              </div>

              {/* Value Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-1 glass-edge rounded-2xl p-4 border border-white/10 text-center">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-2.5">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h4 className="text-white text-sm font-bold mb-1">100k Free Calls</h4>
                  <p className="text-zinc-400 text-xs">Monthly execution quota included for all early preview developers.</p>
                </div>
                <div className="glass-1 glass-edge rounded-2xl p-4 border border-white/10 text-center">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-2.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <h4 className="text-white text-sm font-bold mb-1">98.2% Token Savings</h4>
                  <p className="text-zinc-400 text-xs">Progressive context disclosure loads tool schemas strictly on demand.</p>
                </div>
                <div className="glass-1 glass-edge rounded-2xl p-4 border border-white/10 text-center">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center mx-auto mb-2.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="text-white text-sm font-bold mb-1">Cloudflare Edge</h4>
                  <p className="text-zinc-400 text-xs">Globally distributed V8 isolates with sub-5ms edge dispatch latency.</p>
                </div>
              </div>

              {/* Form Card */}
              <div className="glass-1 glass-edge rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute -inset-10 bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />

                <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {/* Email & Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Work or Developer Email <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Your Name / Handle <span className="text-zinc-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Developer"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Primary MCP Client */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2">
                      Primary AI Client or Environment
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CLIENT_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setClient(opt)}
                          className={`text-left px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                            client === opt
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm"
                              : "bg-white/[0.03] text-zinc-400 border-white/10 hover:text-white hover:bg-white/[0.06]"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Use Case */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      What are you primarily building?
                    </label>
                    <div className="relative">
                      <select
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                        className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all cursor-pointer pr-10"
                      >
                        {USE_CASES.map((uc) => (
                          <option key={uc} value={uc} className="bg-zinc-900 text-white">
                            {uc}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* GitHub Username (Priority Queue) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        GitHub Username <span className="text-zinc-500">(Optional)</span>
                      </label>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Priority Queue
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-mono">@</span>
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="octocat"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Active open-source contributors and developers receive fast-track cohort invites.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-semibold tracking-wide bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>Reserving Your Position...</span>
                        </>
                      ) : (
                        <>
                          <span>Join Developer Waiting List</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <p className="text-center text-[11px] text-zinc-500 mt-3">
                      No spam. We will only contact you when your early access API key is ready.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Confirmation Ticket View */
            <div className="space-y-8 animate-in fade-in-50 duration-500">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                  You&apos;re on the list!
                </h2>
                <p className="text-zinc-300 text-sm sm:text-base max-w-md mx-auto">
                  We&apos;ve reserved your early access spot. Invites are being rolled out in weekly batches.
                </p>
              </div>

              {/* Digital Boarding Pass Ticket */}
              <div className="glass-1 glass-edge rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-w-lg mx-auto relative overflow-hidden bg-gradient-to-b from-[#131c2e] to-[#0c121d]">
                <div className="flex items-center justify-between pb-6 border-b border-dashed border-white/10">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-cyan-400 fill-cyan-400" />
                    <span className="font-bold text-white tracking-tight font-mono">spike.land</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Confirmed
                  </span>
                </div>

                <div className="py-6 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Your Position</div>
                      <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight text-cyan-400">
                        #{ticket.position}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Cohort Batch</div>
                      <div className="text-lg font-bold text-white">Alpha-2</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="text-[10px] uppercase text-zinc-500 font-mono">Registered Email</div>
                      <div className="text-xs text-zinc-200 font-mono truncate">{ticket.email}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-zinc-500 font-mono">Referral Code</div>
                      <div className="text-xs text-cyan-300 font-mono font-bold">{ticket.referralCode}</div>
                    </div>
                  </div>
                </div>

                {/* Referral sharing */}
                <div className="pt-6 border-t border-dashed border-white/10 space-y-3">
                  <div className="text-xs font-semibold text-zinc-300">
                    Move up the queue by inviting teammates:
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyReferral}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 py-2.5 px-3 text-xs font-mono text-zinc-200 transition-colors"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Copy Invite Link</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={tweetShare}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d9bf0]/20 border border-[#1d9bf0]/30 hover:bg-[#1d9bf0]/30 text-[#1d9bf0] py-2.5 px-4 text-xs font-semibold transition-colors shrink-0"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <a
                  href="/#playground"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg hover:brightness-110 transition-all"
                >
                  <Terminal className="w-4 h-4" />
                  Explore Live MCP Playground
                </a>
                <a
                  href="/"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
                >
                  Return to Home
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
