"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Key,
  Puzzle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Chrome,
  AlertCircle,
} from "lucide-react";
import {
  isExtensionInstalled,
  waitForExtension,
  checkAllSessions,
  loginToPlatform,
  type PlatformSession,
} from "@/lib/extension";

// ── Constants ───────────────────────────────────────────────

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"] },
  { id: "google", name: "Google Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] },
  { id: "groq", name: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
  { id: "together", name: "Together AI", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"] },
  { id: "openrouter", name: "OpenRouter", models: ["anthropic/claude-sonnet-4", "openai/gpt-4o"] },
  { id: "custom", name: "Custom", models: [] },
];

const PLATFORMS = [
  { id: "depop", name: "Depop", color: "#ff2300", loginUrl: "https://www.depop.com/login/" },
  { id: "grailed", name: "Grailed", color: "#333333", loginUrl: "https://www.grailed.com/users/sign_in" },
  { id: "poshmark", name: "Poshmark", color: "#c83264", loginUrl: "https://poshmark.com/login" },
  { id: "mercari", name: "Mercari", color: "#4dc4c0", loginUrl: "https://www.mercari.com/login/" },
  { id: "ebay", name: "eBay", color: "#e53238", loginUrl: "https://signin.ebay.com/" },
];

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Extension state
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [checkingExtension, setCheckingExtension] = useState(false);

  // Platform sessions
  const [sessions, setSessions] = useState<Record<string, PlatformSession>>({});
  const [checkingSessions, setCheckingSessions] = useState(false);

  // AI config
  const [aiProvider, setAiProvider] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");

  const selectedProviderData = AI_PROVIDERS.find((p) => p.id === aiProvider);

  // ── Extension detection ──────────────────────────────────

  const detectExtension = useCallback(async () => {
    setCheckingExtension(true);
    const found = await waitForExtension(3000);
    setExtensionDetected(found);
    setCheckingExtension(false);
    if (found) {
      // Immediately check sessions too
      refreshSessions();
    }
  }, []);

  useEffect(() => {
    detectExtension();
  }, [detectExtension]);

  // ── Session refresh ──────────────────────────────────────

  const refreshSessions = async () => {
    if (!isExtensionInstalled()) return;
    setCheckingSessions(true);
    try {
      const result = await checkAllSessions();
      setSessions(result);
    } catch {
      // Extension might not be ready yet
    }
    setCheckingSessions(false);
  };

  const connectedCount = Object.values(sessions).filter((s) => s.connected).length;

  // ── Open platform login ──────────────────────────────────

  const openLogin = async (platformId: string) => {
    try {
      await loginToPlatform(platformId);
      toast.success("Login page opened — log in then come back here");
    } catch {
      // Fallback: open directly
      const platform = PLATFORMS.find((p) => p.id === platformId);
      if (platform) window.open(platform.loginUrl, "_blank");
    }
  };

  // ── Finish ───────────────────────────────────────────────

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProvider: aiProvider || undefined,
          aiApiKey: aiApiKey || undefined,
          aiModel: aiModel || undefined,
          platforms: Object.entries(sessions)
            .filter(([, s]) => s.connected)
            .map(([id]) => id),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("You're all set! Welcome to ListBlitz.");
      router.push("/");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Steps ────────────────────────────────────────────────

  const steps = [
    { label: "Welcome", icon: Sparkles },
    { label: "Extension", icon: Puzzle },
    { label: "Platforms", icon: ShieldCheck },
    { label: "AI Setup", icon: Key },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #1a1a2e))" }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-5 justify-center">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">ListBlitz</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  i === step
                    ? "bg-white text-gray-900"
                    : i < step
                    ? "bg-white/30 text-white cursor-pointer"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {i < step ? <CheckCircle className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className={`w-4 sm:w-8 h-px ${i < step ? "bg-white/50" : "bg-white/15"}`} />}
            </div>
          ))}
        </div>

        <Card className="rounded-2xl shadow-2xl">
          <CardContent className="pt-6 pb-6">

            {/* ═══ STEP 0: WELCOME ═══ */}
            {step === 0 && (
              <div className="text-center space-y-5 py-2">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--accent)" }}>
                  <Sparkles className="h-8 w-8" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to ListBlitz!</h2>
                  <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto text-sm">
                    List once, sell everywhere. We&apos;ll get you set up in 2 minutes.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { emoji: "📸", label: "AI Listings", desc: "Photo to listing in 10s" },
                    { emoji: "🚀", label: "5 Platforms", desc: "Depop, Grailed, Poshmark, Mercari, eBay" },
                    { emoji: "📊", label: "P&L Tracking", desc: "Revenue, profit, margins" },
                  ].map((f) => (
                    <div key={f.label} className="bg-muted/40 rounded-xl p-3 text-center">
                      <span className="text-xl">{f.emoji}</span>
                      <p className="text-xs font-semibold mt-1">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setStep(1)} className="w-full h-11 rounded-xl font-semibold text-sm">
                  Let&apos;s Get Started <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* ═══ STEP 1: EXTENSION INSTALL ═══ */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent)" }}>
                    <Chrome className="h-7 w-7" style={{ color: "var(--primary)" }} />
                  </div>
                  <h2 className="text-xl font-bold mb-1">Install the Browser Extension</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    The ListBlitz extension connects to your marketplace accounts and handles cross-posting automatically.
                  </p>
                </div>

                {/* Status */}
                <div className={`rounded-xl p-4 text-center ${
                  extensionDetected
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                }`}>
                  {checkingExtension ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking for extension...
                    </div>
                  ) : extensionDetected ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Extension detected and ready!</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-semibold">Extension not detected</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Install it from the Chrome Web Store, then click &quot;Check Again&quot;
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-lg gap-1.5"
                          onClick={() => window.open("https://chrome.google.com/webstore", "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Chrome Web Store
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg gap-1.5"
                          onClick={detectExtension}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Check Again
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* How it works */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs font-semibold mb-2">How it works:</p>
                  <ol className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex gap-2"><span className="font-bold text-foreground">1.</span> Install the extension</li>
                    <li className="flex gap-2"><span className="font-bold text-foreground">2.</span> Log into each marketplace in your browser (as you normally would)</li>
                    <li className="flex gap-2"><span className="font-bold text-foreground">3.</span> The extension detects your login and connects automatically</li>
                    <li className="flex gap-2"><span className="font-bold text-foreground">4.</span> ListBlitz publishes listings through your existing sessions</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="h-10 rounded-xl">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="h-10 rounded-xl text-muted-foreground text-xs"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    className="flex-1 h-10 rounded-xl font-semibold text-sm"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ═══ STEP 2: CONNECT PLATFORMS ═══ */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent)" }}>
                    <ShieldCheck className="h-7 w-7" style={{ color: "var(--primary)" }} />
                  </div>
                  <h2 className="text-xl font-bold mb-1">Connect Your Platforms</h2>
                  <p className="text-sm text-muted-foreground">
                    {extensionDetected
                      ? "Log into each platform — the extension will detect your session."
                      : "Select the platforms you sell on. You'll connect them later."}
                  </p>
                </div>

                {/* Platform list */}
                <div className="space-y-2">
                  {PLATFORMS.map((p) => {
                    const session = sessions[p.id];
                    const connected = session?.connected || false;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          connected
                            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : "border-border"
                        }`}
                      >
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className={`text-xs ${connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                            {connected ? "Connected" : "Not connected"}
                          </p>
                        </div>
                        {connected ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs rounded-lg shrink-0"
                            onClick={() => {
                              if (extensionDetected) openLogin(p.id);
                              else window.open(p.loginUrl, "_blank");
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Log in
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Refresh button */}
                {extensionDetected && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs rounded-lg"
                    onClick={refreshSessions}
                    disabled={checkingSessions}
                  >
                    {checkingSessions ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                    )}
                    {checkingSessions ? "Checking..." : `Refresh connections (${connectedCount}/5 connected)`}
                  </Button>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-10 rounded-xl">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1 h-10 rounded-xl font-semibold text-sm">
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ═══ STEP 3: AI SETUP ═══ */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent)" }}>
                    <Key className="h-7 w-7" style={{ color: "var(--primary)" }} />
                  </div>
                  <h2 className="text-xl font-bold mb-1">AI Configuration</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect an AI provider to power listing optimization, pricing intelligence, and more.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AI_PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setAiProvider(p.id); setAiModel(p.models[0] || ""); }}
                          className={`text-left px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                            aiProvider === p.id
                              ? "border-[var(--primary)] bg-[var(--accent)]"
                              : "border-border hover:border-[var(--primary)]/50"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {aiProvider && (
                    <>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          placeholder="sk-..."
                          value={aiApiKey}
                          onChange={(e) => setAiApiKey(e.target.value)}
                          className="h-10"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Stored securely on your server. Never shared.
                        </p>
                      </div>
                      {selectedProviderData && selectedProviderData.models.length > 0 && (
                        <div className="space-y-2">
                          <Label>Model</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedProviderData.models.map((m) => (
                              <button
                                key={m}
                                onClick={() => setAiModel(m)}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                                  aiModel === m
                                    ? "border-[var(--primary)] bg-[var(--accent)]"
                                    : "border-border hover:border-[var(--primary)]/50"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setStep(2)} className="h-10 rounded-xl">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleFinish}
                    className="h-10 rounded-xl text-muted-foreground text-xs"
                    disabled={loading}
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleFinish}
                    disabled={loading}
                    className="flex-1 h-10 rounded-xl font-semibold text-sm"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Setting up...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Launch ListBlitz</>
                    )}
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Skip all */}
        {step > 0 && step < 3 && (
          <button
            onClick={() => { setStep(3); }}
            className="block mx-auto mt-3 text-white/50 text-xs hover:text-white/80 transition-colors"
          >
            Skip setup entirely →
          </button>
        )}
      </div>
    </div>
  );
}
