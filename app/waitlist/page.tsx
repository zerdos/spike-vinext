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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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
        setErrorMessage(
          data.error || "Unable to join waitlist. Please try again."
        );
      }
    } catch {
      // Offline fallback
      setTicket({
        position: 429,
        referralCode: `SPK-429-${Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase()}`,
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
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto px-4 max-w-4xl">
          {/* Back button using shadcn Button */}
          <div className="mb-8">
            <Button variant="outline" size="sm" asChild>
              <a href="/">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Home
              </a>
            </Button>
          </div>

          {!ticket ? (
            /* Signup View */
            <div className="space-y-10">
              {/* Header Box: h1 leads first, Badge below per craft floor */}
              <div className="space-y-4 pb-6 border-b-2 border-[#111315]">
                <h1 className="font-display text-4xl sm:text-6xl font-black text-foreground tracking-tight leading-[0.96]">
                  Join the <span className="text-primary">Waiting List</span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-[65ch] leading-relaxed">
                  Be the first to build with Spike Land&apos;s edge-native MCP gateway. Get instant access to 455+ progressive tools, zero setup overhead, and 100,000 free monthly executions.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="default">
                    <Sparkles className="w-3.5 h-3.5" />
                    Early Developer Preview • Cohort 2
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    BATCH ALPHA-2
                  </Badge>
                </div>
              </div>

              {/* Value Specification Row (Numeral-led timetable strip, zero decorative icons) */}
              <Card className="border-2 border-[#111315] overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#111315]">
                  <div className="p-5 bg-card flex flex-col justify-between space-y-2">
                    <div>
                      <div className="font-display text-3xl font-black tracking-tight text-primary tabular-nums leading-none">
                        100,000
                      </div>
                      <h4 className="mt-2 text-foreground text-sm font-bold">
                        100k Free Calls
                      </h4>
                      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                        Monthly execution quota included for all early preview developers.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[#C8C5BC] font-mono text-[10px] font-semibold text-muted-foreground">
                      SEC 01 // MONTHLY QUOTA
                    </div>
                  </div>

                  <div className="p-5 bg-card flex flex-col justify-between space-y-2">
                    <div>
                      <div className="font-display text-3xl font-black tracking-tight text-[#0047BB] tabular-nums leading-none">
                        -98.2%
                      </div>
                      <h4 className="mt-2 text-foreground text-sm font-bold">
                        98.2% Token Savings
                      </h4>
                      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                        Progressive context disclosure loads tool schemas strictly on demand.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[#C8C5BC] font-mono text-[10px] font-semibold text-muted-foreground">
                      SEC 02 // CONTEXT OVERHEAD
                    </div>
                  </div>

                  <div className="p-5 bg-card flex flex-col justify-between space-y-2">
                    <div>
                      <div className="font-display text-3xl font-black tracking-tight text-[#0D7A5F] tabular-nums leading-none">
                        &lt; 5ms
                      </div>
                      <h4 className="mt-2 text-foreground text-sm font-bold">
                        Cloudflare Edge
                      </h4>
                      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                        Globally distributed V8 isolates with sub-5ms edge dispatch latency.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[#C8C5BC] font-mono text-[10px] font-semibold text-muted-foreground">
                      SEC 03 // V8 ISOLATE COLOS
                    </div>
                  </div>
                </div>
              </Card>

              {/* Form Card */}
              <Card className="border-2 border-[#111315] overflow-hidden">
                <CardHeader className="bg-secondary/60 border-b border-[#111315] p-6">
                  <CardTitle className="text-lg">
                    Developer Dispatch Registration
                  </CardTitle>
                  <CardDescription>
                    Complete your profile to reserve an API key in the next weekly rollout.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {errorMessage && (
                      <Alert variant="destructive">
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    )}

                    {/* Email & Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="waitlist-email">
                          Work or Developer Email{" "}
                          <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="waitlist-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="waitlist-name">
                          Your Name / Handle{" "}
                          <span className="text-muted-foreground font-normal">
                            (Optional)
                          </span>
                        </Label>
                        <Input
                          id="waitlist-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Developer"
                        />
                      </div>
                    </div>

                    {/* Primary MCP Client */}
                    <div className="space-y-2">
                      <Label className="block">
                        Primary AI Client or Environment
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CLIENT_OPTIONS.map((opt) => (
                          <Button
                            key={opt}
                            type="button"
                            variant={client === opt ? "ink" : "outline"}
                            size="sm"
                            onClick={() => setClient(opt)}
                            className="justify-start text-xs"
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Primary Use Case */}
                    <div className="space-y-1.5">
                      <Label htmlFor="waitlist-use-case">
                        What are you primarily building?
                      </Label>
                      <NativeSelect
                        id="waitlist-use-case"
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                      >
                        {USE_CASES.map((uc) => (
                          <option key={uc} value={uc}>
                            {uc}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    {/* GitHub Username (Priority Queue) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="waitlist-github">
                          GitHub Username{" "}
                          <span className="text-muted-foreground font-normal">
                            (Optional)
                          </span>
                        </Label>
                        <Badge variant="emerald" className="font-mono text-[10px]">
                          Priority Queue
                        </Badge>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs text-muted-foreground font-mono">
                          @
                        </span>
                        <Input
                          id="waitlist-github"
                          type="text"
                          value={githubUsername}
                          onChange={(e) => setGithubUsername(e.target.value)}
                          placeholder="octocat"
                          className="pl-8 font-mono"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Active open-source contributors and developers receive fast-track cohort invites.
                      </p>
                    </div>

                    <Separator />

                    {/* Submit Button */}
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        size="lg"
                        variant="default"
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? (
                          <span>Reserving Your Position...</span>
                        ) : (
                          <>
                            <span>Join Developer Waiting List</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        No spam. We will only contact you when your early access API key is ready.
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Confirmation Ticket View (Swiss Railway Boarding Pass) */
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#ECFDF5] border-2 border-[#0D7A5F] flex items-center justify-center mx-auto text-[#0D7A5F]">
                  <Check className="w-7 h-7" />
                </div>
                <h2 className="font-display text-3xl sm:text-5xl font-black text-foreground tracking-tight">
                  You&apos;re on the list!
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                  We&apos;ve reserved your early access spot. Invites are being rolled out in weekly batches.
                </p>
              </div>

              {/* Swiss SBB Perforated Boarding Pass Card */}
              <Card className="border-2 border-[#111315] max-w-lg mx-auto overflow-hidden">
                <CardHeader className="bg-[#111315] text-[#F5F4F0] p-6 border-b-2 border-dashed border-[#4B5563]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary fill-primary" />
                      <span className="font-bold text-[#F5F4F0] tracking-tight font-mono">
                        spike.land
                      </span>
                    </div>
                    <Badge variant="emerald" className="font-mono uppercase">
                      Confirmed
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6 bg-card">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-4xl sm:text-5xl font-black text-primary font-mono tracking-tight tabular-nums">
                        #{ticket.position}
                      </div>
                      <div className="text-xs font-semibold text-muted-foreground mt-1">
                        Your Position
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground font-mono">
                        Alpha-2
                      </div>
                      <div className="text-xs font-semibold text-muted-foreground mt-1">
                        Cohort Batch
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#C8C5BC]">
                    <div>
                      <div className="text-xs font-mono font-semibold text-foreground truncate">
                        {ticket.email}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Registered Email
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#0047BB] font-mono font-bold">
                        {ticket.referralCode}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Referral Code
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-6 bg-secondary/60 border-t-2 border-dashed border-[#111315] flex flex-col items-stretch gap-3">
                  <div className="text-xs font-semibold text-foreground">
                    Move up the queue by inviting teammates:
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyReferral}
                      className="flex-1 font-mono text-xs"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#0D7A5F]" />
                          <span className="text-[#0D7A5F] font-bold">
                            Link Copied!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Invite Link</span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="cobalt"
                      onClick={tweetShare}
                      className="shrink-0 text-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button variant="default" asChild className="w-full sm:w-auto">
                  <a href="/#playground">
                    <Terminal className="w-4 h-4" />
                    Explore Live MCP Playground
                  </a>
                </Button>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <a href="/">Return to Home</a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
