"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Key,
  Lock,
  Shield,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Save,
  LogOut,
  User,
  Terminal,
  ArrowLeft,
  Sparkles,
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AuthUser } from "@/lib/auth/types";

interface ApiTokenItem {
  id: string;
  userId: string;
  name: string;
  tokenValue: string;
  tokenPrefix: string;
  provider: string;
  scopes: string[];
  createdAt: string;
}

const DEFAULT_PROVIDER_FIELDS = [
  {
    key: "SPIKE_API_KEY",
    label: "Spike Land MCP Gateway Token",
    placeholder: "spk_live_...",
    description: "Primary Bearer token for https://spike.land/api/mcp",
  },
  {
    key: "OPENAI_API_KEY",
    label: "OpenAI API Key",
    placeholder: "sk-proj-...",
    description: "Used by AI & Creative and code synthesis tools",
  },
  {
    key: "ANTHROPIC_API_KEY",
    label: "Anthropic API Key",
    placeholder: "sk-ant-...",
    description: "Used by Claude subagent and evaluation tools",
  },
  {
    key: "GITHUB_TOKEN",
    label: "GitHub Personal Access Token",
    placeholder: "ghp_...",
    description: "Used by Development and repository inspection tools",
  },
  {
    key: "CLOUDFLARE_API_TOKEN",
    label: "Cloudflare API Token",
    placeholder: "cf_...",
    description: "Used by Browser Run and Workers edge deployment tools",
  },
];

export default function SettingsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Provider API Tokens state
  const [providerTokens, setProviderTokens] = useState<Record<string, string>>({
    SPIKE_API_KEY: "",
    OPENAI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    GITHUB_TOKEN: "",
    CLOUDFLARE_API_TOKEN: "",
  });
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [customTokenKey, setCustomTokenKey] = useState("");
  const [customTokenVal, setCustomTokenVal] = useState("");
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Personal MCP Gateway Tokens list state
  const [apiTokens, setApiTokens] = useState<ApiTokenItem[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenCustomValue, setNewTokenCustomValue] = useState("");
  const [tokenCreating, setTokenCreating] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedTokenIds, setRevealedTokenIds] = useState<Record<string, boolean>>({});

  const loadSessionAndTokens = useCallback(async () => {
    setAuthLoading(true);
    try {
      const sessionRes = await fetch("/api/auth/session", {
        headers: { Accept: "application/json" },
      });
      if (sessionRes.ok) {
        const sessionData = (await sessionRes.json()) as {
          authenticated: boolean;
          user: AuthUser | null;
        };
        if (sessionData.authenticated && sessionData.user) {
          setUser(sessionData.user);

          const tokensRes = await fetch("/api/settings/tokens", {
            headers: { Accept: "application/json" },
          });
          if (tokensRes.ok) {
            const tokensData = (await tokensRes.json()) as {
              tokens?: ApiTokenItem[];
              providerTokens?: Record<string, string>;
            };
            if (tokensData.tokens) {
              setApiTokens(tokensData.tokens);
            }
            if (tokensData.providerTokens) {
              setProviderTokens((prev) => ({
                ...prev,
                ...tokensData.providerTokens,
              }));
            }
          }
        } else {
          setUser(null);
        }
      }
    } catch {
      // Ignore network error during initial load
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessionAndTokens();
  }, [loadSessionAndTokens]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword || !newPassword) {
      setPasswordStatus({
        type: "error",
        message: "Please fill in both your current password and new password.",
      });
      return;
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "New password and confirmation password do not match.",
      });
      return;
    }

    if (newPassword.length < 4) {
      setPasswordStatus({
        type: "error",
        message: "New password must be at least 4 characters long.",
      });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword: confirmPassword || newPassword,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (res.ok && data.success) {
        setPasswordStatus({
          type: "success",
          message: data.message || "Password updated successfully.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus({
          type: "error",
          message: data.message || data.error || "Failed to update password.",
        });
      }
    } catch {
      setPasswordStatus({
        type: "error",
        message: "Network error while updating password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveProviderTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    setProviderStatus(null);
    setProviderSaving(true);

    const updatedMap = { ...providerTokens };
    if (customTokenKey.trim()) {
      updatedMap[customTokenKey.trim()] = customTokenVal.trim();
    }

    try {
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_provider_tokens",
          providerTokens: updatedMap,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        providerTokens?: Record<string, string>;
      };

      if (res.ok && data.success) {
        if (data.providerTokens) {
          setProviderTokens(data.providerTokens);
        } else {
          setProviderTokens(updatedMap);
        }
        if (customTokenKey.trim()) {
          setCustomTokenKey("");
          setCustomTokenVal("");
        }
        setProviderStatus({
          type: "success",
          message: data.message || "API tokens saved to your workspace.",
        });
      } else {
        setProviderStatus({
          type: "error",
          message: data.message || "Unable to save API tokens.",
        });
      }
    } catch {
      setProviderStatus({
        type: "error",
        message: "Network error while saving API tokens.",
      });
    } finally {
      setProviderSaving(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenStatus(null);

    const trimmedName = newTokenName.trim();
    if (!trimmedName) {
      setTokenStatus({
        type: "error",
        message: "Please provide a name for the API token.",
      });
      return;
    }

    setTokenCreating(true);
    try {
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_token",
          name: trimmedName,
          customTokenValue: newTokenCustomValue.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        token?: ApiTokenItem;
      };

      if (res.ok && data.token) {
        setApiTokens((prev) => [data.token!, ...prev]);
        setNewTokenName("");
        setNewTokenCustomValue("");
        setRevealedTokenIds((prev) => ({ ...prev, [data.token!.id]: true }));
        setTokenStatus({
          type: "success",
          message: `Created token "${data.token.name}". Copy or inspect it below.`,
        });
      } else {
        setTokenStatus({
          type: "error",
          message: data.message || "Failed to create API token.",
        });
      }
    } catch {
      setTokenStatus({
        type: "error",
        message: "Network error while creating API token.",
      });
    } finally {
      setTokenCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      const res = await fetch(
        `/api/settings/tokens?id=${encodeURIComponent(tokenId)}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        setApiTokens((prev) => prev.filter((t) => t.id !== tokenId));
        setTokenStatus({
          type: "success",
          message: "API token revoked.",
        });
      }
    } catch {
      setTokenStatus({
        type: "error",
        message: "Failed to revoke API token.",
      });
    }
  };

  const copyToClipboard = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/auth/signin";
  };

  // Extra custom keys that aren't in DEFAULT_PROVIDER_FIELDS
  const customKeys = Object.keys(providerTokens).filter(
    (k) => !DEFAULT_PROVIDER_FIELDS.some((f) => f.key === k)
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-10">
          {/* Top navigation & Page Header */}
          <div className="space-y-4 pb-6 border-b-2 border-[#111315]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href="/">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Home
                </a>
              </Button>

              {user && (
                <div className="flex items-center gap-2">
                  <Badge variant="cobalt" className="font-mono">
                    {user.email}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-[0.98]">
              Account &amp; API <span className="text-primary">Settings</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-[65ch]">
              Manage your account credentials, change your password, and configure MCP gateway &amp; upstream provider API tokens.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="default" className="font-mono text-[11px]">
                <Shield className="w-3.5 h-3.5" />
                WORKSPACE SECURITY
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px]">
                RFC 8707 TOKEN VAULT
              </Badge>
            </div>
          </div>

          {authLoading ? (
            <Card className="border-2 border-[#111315] p-8 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                Loading workspace settings...
              </p>
            </Card>
          ) : !user ? (
            <Card className="border-2 border-[#111315] overflow-hidden">
              <CardHeader className="bg-secondary/60 border-b border-[#111315] p-6">
                <CardTitle>Authentication Required</CardTitle>
                <CardDescription>
                  Please sign in to change your password or configure API tokens.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  You are currently viewing this page as an unauthenticated guest. Sign in with your Spike Land username and password (for example <code className="font-mono font-semibold text-foreground">admin@spike.land</code>) to access your settings.
                </p>
                <Button variant="default" asChild>
                  <a href="/auth/signin?returnTo=/settings">
                    Go to Sign In
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-10">
              {/* Profile Overview Card */}
              <Card className="border-2 border-[#111315] overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#111315]">
                  <div className="p-5 bg-card">
                    <div className="font-mono text-xs text-muted-foreground uppercase">
                      Signed In Account
                    </div>
                    <div className="mt-1 font-mono text-base font-bold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                  <div className="p-5 bg-card">
                    <div className="font-mono text-xs text-muted-foreground uppercase">
                      Role &amp; Provider
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="emerald" className="font-mono uppercase">
                        {user.role || "admin"}
                      </Badge>
                      <Badge variant="secondary" className="font-mono">
                        {user.provider}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-5 bg-card">
                    <div className="font-mono text-xs text-muted-foreground uppercase">
                      Configured API Keys
                    </div>
                    <div className="mt-1 font-display text-2xl font-black text-[#0047BB] tabular-nums">
                      {apiTokens.length +
                        Object.values(providerTokens).filter(Boolean).length}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Section 1: API Tokens Configuration (Provider Keys + Personal MCP Keys) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Upstream & Provider API Tokens Form */}
                <div className="lg:col-span-7 space-y-6">
                  <Card className="border-2 border-[#111315] overflow-hidden">
                    <CardHeader className="bg-[#111315] text-[#F5F4F0] p-6 border-b border-[#111315]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Key className="w-5 h-5 text-primary" />
                          <CardTitle className="text-lg text-[#F5F4F0]">
                            API Tokens Configuration
                          </CardTitle>
                        </div>
                        <Badge variant="default" className="font-mono text-[10px]">
                          ENCRYPTED AT EDGE
                        </Badge>
                      </div>
                      <CardDescription className="text-[#B8BDC7] text-xs mt-1">
                        Set your Spike Land gateway token and upstream provider API tokens for tool execution.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6">
                      <form
                        onSubmit={handleSaveProviderTokens}
                        className="space-y-5"
                      >
                        {providerStatus && (
                          <Alert
                            variant={
                              providerStatus.type === "error"
                                ? "destructive"
                                : "emerald"
                            }
                            aria-live="polite"
                          >
                            <AlertTitle>
                              {providerStatus.type === "error"
                                ? "Update Error"
                                : "Tokens Saved"}
                            </AlertTitle>
                            <AlertDescription>
                              {providerStatus.message}
                            </AlertDescription>
                          </Alert>
                        )}

                        {DEFAULT_PROVIDER_FIELDS.map((field) => {
                          const isRevealed = Boolean(revealedKeys[field.key]);
                          const val = providerTokens[field.key] || "";
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`token-${field.key}`}>
                                  {field.label}
                                </Label>
                                <span className="font-mono text-[11px] text-[#0047BB] font-semibold">
                                  {field.key}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    id={`token-${field.key}`}
                                    name={field.key}
                                    type={isRevealed ? "text" : "password"}
                                    value={val}
                                    onChange={(e) =>
                                      setProviderTokens((prev) => ({
                                        ...prev,
                                        [field.key]: e.target.value,
                                      }))
                                    }
                                    placeholder={field.placeholder}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    className="font-mono text-xs pr-9"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedKeys((prev) => ({
                                        ...prev,
                                        [field.key]: !prev[field.key],
                                      }))
                                    }
                                    aria-label={
                                      isRevealed
                                        ? `Hide ${field.label}`
                                        : `Show ${field.label}`
                                    }
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                                {val && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                      copyToClipboard(`prov_${field.key}`, val)
                                    }
                                    aria-label={`Copy ${field.key}`}
                                  >
                                    {copiedId === `prov_${field.key}` ? (
                                      <Check className="w-4 h-4 text-[#0D7A5F]" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {field.description}
                              </p>
                            </div>
                          );
                        })}

                        {/* Render any custom provider keys */}
                        {customKeys.map((k) => {
                          const isRevealed = Boolean(revealedKeys[k]);
                          const val = providerTokens[k] || "";
                          return (
                            <div key={k} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`token-${k}`}>{k}</Label>
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                  CUSTOM
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  id={`token-${k}`}
                                  name={k}
                                  type={isRevealed ? "text" : "password"}
                                  value={val}
                                  onChange={(e) =>
                                    setProviderTokens((prev) => ({
                                      ...prev,
                                      [k]: e.target.value,
                                    }))
                                  }
                                  autoComplete="off"
                                  spellCheck={false}
                                  className="font-mono text-xs"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    setRevealedKeys((prev) => ({
                                      ...prev,
                                      [k]: !prev[k],
                                    }))
                                  }
                                  aria-label={`Toggle ${k}`}
                                >
                                  {isRevealed ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        <Separator />

                        {/* Add custom API Token key-value */}
                        <div className="space-y-2 pt-1">
                          <Label className="text-xs font-mono uppercase text-muted-foreground">
                            Add Custom Provider Token (Optional)
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              type="text"
                              value={customTokenKey}
                              onChange={(e) => setCustomTokenKey(e.target.value)}
                              placeholder="BRAVE_API_KEY"
                              aria-label="Custom token variable name"
                              autoComplete="off"
                              spellCheck={false}
                              className="font-mono text-xs"
                            />
                            <Input
                              type="text"
                              value={customTokenVal}
                              onChange={(e) => setCustomTokenVal(e.target.value)}
                              placeholder="Token value..."
                              aria-label="Custom token value"
                              autoComplete="off"
                              spellCheck={false}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          variant="default"
                          disabled={providerSaving}
                          className="w-full border-2 border-[#111315]"
                        >
                          <Save className="w-4 h-4 mr-1.5" />
                          {providerSaving ? "Saving API Tokens..." : "Save API Tokens"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Change Password & Personal Gateway Keys */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Change Password Card */}
                  <Card className="border-2 border-[#111315] overflow-hidden">
                    <CardHeader className="bg-secondary/60 border-b border-[#111315] p-6">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        <CardTitle className="text-lg">Change Password</CardTitle>
                      </div>
                      <CardDescription>
                        Update the password used for username &amp; password sign-in.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6">
                      <form
                        onSubmit={handlePasswordChange}
                        className="space-y-4"
                      >
                        {passwordStatus && (
                          <Alert
                            variant={
                              passwordStatus.type === "error"
                                ? "destructive"
                                : "emerald"
                            }
                            aria-live="polite"
                          >
                            <AlertTitle>
                              {passwordStatus.type === "error"
                                ? "Password Error"
                                : "Password Updated"}
                            </AlertTitle>
                            <AlertDescription>
                              {passwordStatus.message}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-1.5">
                          <Label htmlFor="settings-current-password">
                            Current Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="settings-current-password"
                              name="currentPassword"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) =>
                                setCurrentPassword(e.target.value)
                              }
                              placeholder="Enter current password"
                              autoComplete="current-password"
                              required
                              className="pr-9"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowCurrentPassword((prev) => !prev)
                              }
                              aria-label={
                                showCurrentPassword
                                  ? "Hide current password"
                                  : "Show current password"
                              }
                              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="settings-new-password">
                            New Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="settings-new-password"
                              name="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                              autoComplete="new-password"
                              required
                              className="pr-9"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowNewPassword((prev) => !prev)
                              }
                              aria-label={
                                showNewPassword
                                  ? "Hide new password"
                                  : "Show new password"
                              }
                              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="settings-confirm-password">
                            Confirm New Password
                          </Label>
                          <Input
                            id="settings-confirm-password"
                            name="confirmPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            autoComplete="new-password"
                          />
                        </div>

                        <Button
                          type="submit"
                          variant="ink"
                          disabled={passwordSaving}
                          className="w-full"
                        >
                          {passwordSaving
                            ? "Updating Password..."
                            : "Update Password"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Personal MCP Access Tokens Generator Card */}
                  <Card className="border-2 border-[#111315] overflow-hidden">
                    <CardHeader className="bg-secondary/60 border-b border-[#111315] p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-[#0047BB]" />
                          <CardTitle className="text-lg">
                            Personal MCP Tokens
                          </CardTitle>
                        </div>
                        <Badge variant="cobalt" className="font-mono text-[10px]">
                          {apiTokens.length} ACTIVE
                        </Badge>
                      </div>
                      <CardDescription>
                        Generate or set custom personal API tokens for Claude Desktop, Cursor, or HTTP clients.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-5">
                      {tokenStatus && (
                        <Alert
                          variant={
                            tokenStatus.type === "error"
                              ? "destructive"
                              : "emerald"
                          }
                          aria-live="polite"
                        >
                          <AlertDescription>
                            {tokenStatus.message}
                          </AlertDescription>
                        </Alert>
                      )}

                      <form onSubmit={handleCreateToken} className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="new-token-name">Token Label</Label>
                          <Input
                            id="new-token-name"
                            type="text"
                            value={newTokenName}
                            onChange={(e) => setNewTokenName(e.target.value)}
                            placeholder="e.g. Cursor Laptop Key"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="new-token-value">
                            Custom Token Value{" "}
                            <span className="text-muted-foreground font-normal">
                              (Optional — leave blank to auto-generate)
                            </span>
                          </Label>
                          <Input
                            id="new-token-value"
                            type="text"
                            value={newTokenCustomValue}
                            onChange={(e) =>
                              setNewTokenCustomValue(e.target.value)
                            }
                            placeholder="spk_live_custom_..."
                            autoComplete="off"
                            spellCheck={false}
                            className="font-mono text-xs"
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="cobalt"
                          size="sm"
                          disabled={tokenCreating}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {tokenCreating
                            ? "Creating Token..."
                            : "Create API Token"}
                        </Button>
                      </form>

                      <Separator />

                      <div className="space-y-3">
                        {apiTokens.map((tok) => {
                          const isShown = Boolean(revealedTokenIds[tok.id]);
                          return (
                            <div
                              key={tok.id}
                              className="p-3.5 rounded-md border border-[#111315] bg-secondary/30 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-sm text-foreground">
                                  {tok.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setRevealedTokenIds((prev) => ({
                                        ...prev,
                                        [tok.id]: !prev[tok.id],
                                      }))
                                    }
                                    aria-label={
                                      isShown ? "Hide token" : "Reveal token"
                                    }
                                    className="h-7 w-7"
                                  >
                                    {isShown ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      copyToClipboard(tok.id, tok.tokenValue)
                                    }
                                    aria-label={`Copy token ${tok.name}`}
                                    className="h-7 w-7"
                                  >
                                    {copiedId === tok.id ? (
                                      <Check className="w-3.5 h-3.5 text-[#0D7A5F]" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRevokeToken(tok.id)}
                                    aria-label={`Revoke token ${tok.name}`}
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="font-mono text-xs text-[#0D7A5F] bg-card px-2.5 py-1.5 rounded-sm border border-[#C8C5BC] overflow-x-auto">
                                {isShown ? tok.tokenValue : tok.tokenPrefix}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>

                    <CardFooter className="bg-secondary/40 border-t border-[#111315] px-6 py-3 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        MCP 2026-07-28 Ready
                      </span>
                      <a
                        href="/#playground"
                        className="font-mono text-xs font-semibold text-[#0047BB] hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Test in Playground
                      </a>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
