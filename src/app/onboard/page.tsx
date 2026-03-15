"use client";

import { useState } from "react";
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
  Store,
  CheckCircle,
} from "lucide-react";

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"] },
  { id: "google", name: "Google Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] },
  { id: "groq", name: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"] },
  { id: "together", name: "Together AI", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo"] },
  { id: "openrouter", name: "OpenRouter", models: ["anthropic/claude-sonnet-4", "openai/gpt-4o", "google/gemini-2.5-flash"] },
  { id: "custom", name: "Custom (OpenAI-compatible)", models: [] },
];

const PLATFORMS = [
  { id: "depop", name: "Depop", color: "oklch(0.58 0.18 18)" },
  { id: "grailed", name: "Grailed", color: "oklch(0.4 0 0)" },
  { id: "poshmark", name: "Poshmark", color: "oklch(0.58 0.16 350)" },
  { id: "mercari", name: "Mercari", color: "oklch(0.36 0.10 155)" },
];

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // AI config
  const [aiProvider, setAiProvider] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");

  // Platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const selectedProviderData = AI_PROVIDERS.find((p) => p.id === aiProvider);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

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
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Something went wrong");
        return;
      }

      toast.success("You're all set! Welcome to CrossList.");
      router.push("/");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { label: "Welcome", icon: Sparkles },
    { label: "AI Setup", icon: Key },
    { label: "Platforms", icon: Store },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[oklch(0.28_0.07_155)] to-[oklch(0.40_0.12_155)] p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="h-10 w-10 rounded-full bg-white/15 border-2 border-white/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">CrossList</span>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === step
                    ? "bg-white text-[oklch(0.28_0.07_155)]"
                    : i < step
                    ? "bg-white/30 text-white cursor-pointer hover:bg-white/40"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {i < step ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <s.icon className="h-3.5 w-3.5" />
                )}
                {s.label}
              </button>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px ${i < step ? "bg-white/50" : "bg-white/20"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            {/* Step 1: Welcome */}
            {step === 0 && (
              <div className="text-center space-y-6 py-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Welcome to CrossList!
                  </h2>
                  <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Your AI-powered cross-platform listing tool. Let&apos;s get your account set up in just a couple of quick steps.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: "AI Listings", desc: "Optimized for each platform" },
                    { label: "Cross-Post", desc: "List on 4 marketplaces" },
                    { label: "Analytics", desc: "Track sales & profits" },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="bg-muted/50 rounded-xl p-3 text-center"
                    >
                      <p className="text-xs font-semibold text-foreground">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => setStep(1)}
                  className="w-full h-10 rounded-xl font-semibold"
                >
                  <span className="flex items-center gap-2">
                    Let&apos;s Go
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </div>
            )}

            {/* Step 2: AI Configuration */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Key className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-1">AI Configuration</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect an AI provider to power your listing optimization.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>AI Provider</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AI_PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setAiProvider(p.id);
                            setAiModel(p.models[0] || "");
                          }}
                          className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            aiProvider === p.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50 text-foreground"
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
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          placeholder="sk-..."
                          value={aiApiKey}
                          onChange={(e) => setAiApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from your provider&apos;s website. It&apos;s stored securely on your server.
                        </p>
                      </div>

                      {selectedProviderData && selectedProviderData.models.length > 0 && (
                        <div className="space-y-2">
                          <Label>Model</Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProviderData.models.map((m) => (
                              <button
                                key={m}
                                onClick={() => setAiModel(m)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                  aiModel === m
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border hover:border-primary/50 text-foreground"
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

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="h-10 rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    variant="ghost"
                    className="h-10 rounded-xl text-muted-foreground"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    className="flex-1 h-10 rounded-xl font-semibold"
                    disabled={!aiProvider}
                  >
                    <span className="flex items-center gap-2">
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Platform Connections */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-1">Your Platforms</h2>
                  <p className="text-sm text-muted-foreground">
                    Which platforms do you sell on? You can connect them later in Settings.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {PLATFORMS.map((p) => {
                    const selected = selectedPlatforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`relative flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        {selected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold"
                          style={{ backgroundColor: `color-mix(in oklch, ${p.color} 15%, transparent)`, color: p.color }}
                        >
                          {p.name[0]}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-10 rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={handleFinish}
                    disabled={loading}
                    className="flex-1 h-10 rounded-xl font-semibold"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Setting up...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Finish Setup
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
