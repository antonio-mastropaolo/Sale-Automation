"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Key,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { PlatformAuthButtons } from "@/components/platform-auth-buttons";

// ── Constants ───────────────────────────────────────────────

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", models: ["gpt-5.4", "gpt-5.2", "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "o4-mini"] },
  { id: "google", name: "Google Gemini", models: ["gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro"] },
  { id: "groq", name: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
  { id: "together", name: "Together AI", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"] },
  { id: "openrouter", name: "OpenRouter", models: ["anthropic/claude-sonnet-4", "openai/gpt-5.4"] },
  { id: "custom", name: "Custom", models: [] },
];

const PLATFORMS = [
  { id: "depop", name: "Depop", color: "#ff2300" },
  { id: "grailed", name: "Grailed", color: "#333333" },
  { id: "poshmark", name: "Poshmark", color: "#c83264" },
  { id: "mercari", name: "Mercari", color: "#4dc4c0" },
  { id: "ebay", name: "eBay", color: "#e53238" },
  { id: "vinted", name: "Vinted", color: "#09877e" },
  { id: "facebook", name: "Facebook Marketplace", color: "#1877f2" },
  { id: "vestiaire", name: "Vestiaire Collective", color: "#b8860b" },
];

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Platform credentials
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string }>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());

  // AI config
  const [aiProvider, setAiProvider] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");

  const selectedProviderData = AI_PROVIDERS.find((p) => p.id === aiProvider);

  // ── Dismiss boot screen ────────────────────────────────
  useEffect(() => { window.dispatchEvent(new Event("app:ready")); }, []);

  // ── Fetch existing connections on mount ─────────────────

  useEffect(() => {
    fetch("/api/platforms/connect")
      .then((r) => r.json())
      .then((data: { platform: string; connected: boolean; username: string | null }[]) => {
        const connected = new Set<string>();
        const creds: Record<string, { username: string; password: string }> = {};
        for (const p of data) {
          if (p.connected) {
            connected.add(p.platform);
            if (p.username) creds[p.platform] = { username: p.username, password: "" };
          }
        }
        setConnectedPlatforms(connected);
        setCredentials((prev) => ({ ...creds, ...prev }));
      })
      .catch(() => {});
  }, []);

  const connectedCount = connectedPlatforms.size;

  // ── Save single platform credentials ───────────────────

  const updateCred = (platform: string, field: "username" | "password", value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [platform]: { username: prev[platform]?.username || "", password: prev[platform]?.password || "", [field]: value },
    }));
  };

  const savePlatformCreds = async (platform: string) => {
    const cred = credentials[platform];
    if (!cred?.username || !cred?.password) {
      toast.error("Both username and password are required");
      return;
    }
    setSavingPlatform(platform);
    try {
      const res = await fetch("/api/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username: cred.username, password: cred.password }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${PLATFORMS.find((p) => p.id === platform)?.name} connected!`);
      setConnectedPlatforms((prev) => new Set(prev).add(platform));
      setCredentials((prev) => ({ ...prev, [platform]: { username: cred.username, password: "" } }));
    } catch {
      toast.error("Failed to save credentials");
    }
    setSavingPlatform(null);
  };

  const saveWithAuthMethod = async (platform: string, authMethod: string) => {
    setSavingPlatform(platform);
    try {
      const res = await fetch("/api/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, authMethod, username: "", password: "" }),
      });
      if (!res.ok) throw new Error();
      setConnectedPlatforms((prev) => new Set(prev).add(platform));
    } catch {
      toast.error("Failed to connect");
    }
    setSavingPlatform(null);
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
          platforms: Array.from(connectedPlatforms),
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
    { label: "Platforms", icon: ShieldCheck },
    { label: "AI Setup", icon: Key },
  ];

  return (
    <div className="flex items-start justify-center min-h-[calc(100vh-8rem)] py-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <CheckCircle className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className={`w-4 sm:w-8 h-px ${i < step ? "bg-primary/50" : "bg-border"}`} />}
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
                    { emoji: "🚀", label: "8 Platforms", desc: "Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook, Vestiaire" },
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

            {/* ═══ STEP 1: CONNECT PLATFORMS ═══ */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent)" }}>
                    <ShieldCheck className="h-7 w-7" style={{ color: "var(--primary)" }} />
                  </div>
                  <h2 className="text-xl font-bold mb-1">Connect Your Platforms</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your credentials for each marketplace you sell on. You can always add more later in Settings.
                  </p>
                </div>

                {/* Platform list */}
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {PLATFORMS.map((p) => {
                    const connected = connectedPlatforms.has(p.id);
                    const cred = credentials[p.id] || { username: "", password: "" };
                    const isSaving = savingPlatform === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border transition-all space-y-2 ${
                          connected
                            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{p.name}</p>
                            {connected && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Connected
                              </p>
                            )}
                          </div>
                        </div>
                        {!connected && (
                          <>
                          <PlatformAuthButtons
                            platform={p.id}
                            onAuthMethodSelected={(method) => saveWithAuthMethod(p.id, method)}
                            loading={isSaving}
                          />
                          <div className="flex gap-2 items-end">
                            <Input
                              value={cred.username}
                              onChange={(e) => updateCred(p.id, "username", e.target.value)}
                              placeholder="Username / email"
                              className="h-8 text-xs flex-1"
                            />
                            <div className="relative flex-1">
                              <Input
                                type={showPassword[p.id] ? "text" : "password"}
                                value={cred.password}
                                onChange={(e) => updateCred(p.id, "password", e.target.value)}
                                placeholder="Password"
                                className="h-8 text-xs pr-8"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                            <Button
                              size="sm"
                              className="h-8 text-xs shrink-0"
                              disabled={isSaving || !cred.username || !cred.password}
                              onClick={() => savePlatformCreds(p.id)}
                            >
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                              Save
                            </Button>
                          </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Credentials are encrypted with AES-256 and only used when publishing listings.
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="h-10 rounded-xl">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={() => setStep(2)} className="flex-1 h-10 rounded-xl font-semibold text-sm">
                    Continue ({connectedCount}/8 connected) <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ═══ STEP 2: AI SETUP ═══ */}
            {step === 2 && (
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
                  <Button variant="outline" onClick={() => setStep(1)} className="h-10 rounded-xl">
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
        {step > 0 && step < 2 && (
          <button
            onClick={() => { setStep(2); }}
            className="block mx-auto mt-3 text-muted-foreground text-xs hover:text-foreground transition-colors"
          >
            Skip setup entirely →
          </button>
        )}
      </div>
    </div>
  );
}
