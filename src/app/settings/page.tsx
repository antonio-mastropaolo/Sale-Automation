"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Link2,
  Unlink,
  Shield,
  CheckCircle2,
  XCircle,
  Key,
  Brain,
  Sparkles,
  Settings2,
  Plug,
  Eye,
  EyeOff,
  RotateCcw,
  Play,
  Save,
  ChevronDown,
  ChevronRight,
  Wand2,
  AlertCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { platformBranding } from "@/lib/colors";
import { THEMES as THEME_MAP, applyTheme as applyThemeFromLib, saveTheme as saveThemeToStorage, getSavedTheme as getSavedThemeFromStorage } from "@/lib/themes";

// ── Types ───────────────────────────────────────────────────────────

interface PlatformStatus {
  platform: string;
  connected: boolean;
  updatedAt: string | null;
}

interface PromptEntry {
  featureKey: string;
  label: string;
  description: string;
  category: string;
  variables: string[];
  sampleVars: Record<string, string>;
  defaultPrompt: string;
  customPrompt: string | null;
  isCustomized: boolean;
  updatedAt: string | null;
}

interface TestResult {
  output: string;
  model: string;
  interpolatedPrompt: string;
  tokensUsed: number | null;
}

// ── Provider definitions (client-side mirror) ───────────────────────

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", defaultModel: "gpt-5.4", models: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.2", "gpt-5.2-pro", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o4-mini", "o3", "o3-mini", "o1"] },
  { id: "google", name: "Google Gemini", defaultModel: "gemini-3.1-pro-preview", models: ["gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"] },
  { id: "groq", name: "Groq", defaultModel: "llama-3.3-70b-versatile", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"] },
  { id: "together", name: "Together AI", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1"] },
  { id: "openrouter", name: "OpenRouter", defaultModel: "anthropic/claude-sonnet-4", models: ["anthropic/claude-sonnet-4", "anthropic/claude-haiku-4", "openai/gpt-5.4", "google/gemini-3.1-pro-preview"] },
  { id: "custom", name: "Custom (OpenAI-compatible)", defaultModel: "", models: [] },
];

const CATEGORY_LABELS: Record<string, string> = {
  listing: "Listing & Optimization",
  pricing: "Pricing",
  analytics: "Analytics",
  trends: "Trends",
  negotiation: "Negotiation",
};

const CATEGORY_ORDER = ["listing", "pricing", "analytics", "trends", "negotiation"];

// ── Helpers ─────────────────────────────────────────────────────────

const platformInfo = Object.fromEntries(
  Object.entries(platformBranding).map(([k, v]) => [
    k,
    { name: v.label, color: v.color, bg: v.bg, icon: v.icon },
  ])
) as Record<string, { name: string; color: string; bg: string; icon: string }>;

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your AI provider, customize prompts, connect platforms, and configure defaults
        </p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="ai" className="gap-1.5">
            <Brain className="h-4 w-4" />
            AI Provider
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-1.5">
            <Wand2 className="h-4 w-4" />
            Prompt Studio
          </TabsTrigger>
          <TabsTrigger value="platforms" className="gap-1.5">
            <Plug className="h-4 w-4" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <AIProviderTab />
        </TabsContent>
        <TabsContent value="prompts">
          <PromptStudioTab />
        </TabsContent>
        <TabsContent value="platforms">
          <PlatformsTab />
        </TabsContent>
        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — AI PROVIDER
// ═══════════════════════════════════════════════════════════════════

function AIProviderTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Local form state
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setSettings(data);
        setProvider(data.ai_provider || "openai");
        setApiKey(data.ai_api_key || "");
        setModel(data.ai_model || "");
        setBaseURL(data.ai_base_url || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectedProvider = AI_PROVIDERS.find((p) => p.id === provider) || AI_PROVIDERS[0];

  const handleProviderChange = (newId: string) => {
    setProvider(newId);
    const p = AI_PROVIDERS.find((x) => x.id === newId);
    if (p) {
      setModel(p.defaultModel);
    }
  };

  const save = async () => {
    setSaving(true);
    const payload: Record<string, string> = {
      ai_provider: provider,
      ai_model: model,
    };
    if (keyEdited && apiKey) {
      payload.ai_api_key = apiKey;
    }
    if (provider === "custom" && baseURL) {
      payload.ai_base_url = baseURL;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });
      if (!res.ok) throw new Error();
      toast.success("AI provider settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Auto-save settings first so the test uses the current values
      const payload: Record<string, string> = {
        ai_provider: provider,
        ai_model: model,
      };
      if (keyEdited && apiKey) payload.ai_api_key = apiKey;
      if (provider === "custom" && baseURL) payload.ai_base_url = baseURL;

      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      // Now test
      const res = await fetch("/api/settings/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Say 'Connection successful!' in exactly 3 words. Nothing else.",
          variables: {},
        }),
      });
      const data = await res.json();
      if (data.error) {
        setTestResult(`Error: ${data.error}`);
      } else {
        setTestResult(`Model: ${data.model}\nResponse: ${data.output}\nTokens: ${data.tokensUsed ?? "N/A"}`);
      }
    } catch {
      setTestResult("Error: Failed to reach the API");
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Provider Selection */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Service Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Provider grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AI_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                  provider === p.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-transparent bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <p className="font-semibold text-sm">{p.name}</p>
                {p.defaultModel && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.defaultModel}</p>
                )}
                {provider === p.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyEdited(true);
                  }}
                  placeholder={`Enter your ${selectedProvider.name} API key`}
                  className="h-11 pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Key className="h-3 w-3" />
              {!keyEdited && apiKey
                ? "API key is set (masked for security)"
                : "Your key is stored locally and never shared"}
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label>Model</Label>
            {selectedProvider.models.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedProvider.models.map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      model === m
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Enter model name (e.g., gpt-4o)"
                className="h-11"
              />
            )}
          </div>

          {/* Custom base URL */}
          {provider === "custom" && (
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://your-api.example.com/v1"
                className="h-11 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Must be an OpenAI-compatible API endpoint
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={saving} className="h-10">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
            <Button variant="outline" onClick={testConnection} disabled={testing} className="h-10">
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`p-3 rounded-xl text-sm font-mono whitespace-pre-wrap ${
              testResult.startsWith("Error")
                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}>
              {testResult}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — PROMPT STUDIO
// ═══════════════════════════════════════════════════════════════════

function PromptStudioTab() {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const fetchPrompts = useCallback(() => {
    fetch("/api/settings/prompts")
      .then((r) => r.json())
      .then((data: PromptEntry[]) => {
        setPrompts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    prompts: prompts.filter((p) => p.category === cat),
  })).filter((g) => g.prompts.length > 0);

  const customizedCount = prompts.filter((p) => p.isCustomized).length;

  return (
    <div className="space-y-4 pt-2">
      {/* Summary */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Wand2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Prompt Studio</h3>
              <p className="text-sm text-muted-foreground">
                {customizedCount} of {prompts.length} prompts customized
              </p>
            </div>
            <div className="flex gap-1.5">
              <Badge variant="outline" className="text-xs">
                {prompts.length} prompts
              </Badge>
              {customizedCount > 0 && (
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  {customizedCount} custom
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt groups */}
      {grouped.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 px-1">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.prompts.map((prompt) => (
              <PromptCard
                key={prompt.featureKey}
                prompt={prompt}
                expanded={expandedKey === prompt.featureKey}
                onToggle={() =>
                  setExpandedKey(expandedKey === prompt.featureKey ? null : prompt.featureKey)
                }
                onSaved={fetchPrompts}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Prompt Card (expandable) ────────────────────────────────────────

function PromptCard({
  prompt,
  expanded,
  onToggle,
  onSaved,
}: {
  prompt: PromptEntry;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [editedPrompt, setEditedPrompt] = useState(prompt.customPrompt || prompt.defaultPrompt);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Reset editor when prompt data changes
  useEffect(() => {
    setEditedPrompt(prompt.customPrompt || prompt.defaultPrompt);
  }, [prompt.customPrompt, prompt.defaultPrompt]);

  const hasChanges = editedPrompt !== (prompt.customPrompt || prompt.defaultPrompt);
  const isModifiedFromDefault = editedPrompt !== prompt.defaultPrompt;

  const savePrompt = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey: prompt.featureKey, prompt: editedPrompt }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Saved "${prompt.label}" prompt`);
      onSaved();
    } catch {
      toast.error("Failed to save prompt");
    }
    setSaving(false);
  };

  const resetPrompt = async () => {
    if (!prompt.isCustomized) {
      setEditedPrompt(prompt.defaultPrompt);
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/settings/prompts?featureKey=${prompt.featureKey}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setEditedPrompt(prompt.defaultPrompt);
      toast.success(`Reset "${prompt.label}" to default`);
      onSaved();
    } catch {
      toast.error("Failed to reset prompt");
    }
    setResetting(false);
  };

  const testPrompt = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await fetch("/api/settings/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editedPrompt,
          variables: prompt.sampleVars,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setTestError(data.error);
      } else {
        setTestResult(data);
      }
    } catch {
      setTestError("Failed to reach the API");
    }
    setTesting(false);
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {/* Header (clickable) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{prompt.label}</p>
            {prompt.isCustomized && (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 text-[10px] px-1.5">
                Customized
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{prompt.description}</p>
        </div>
        {prompt.variables.length > 0 && (
          <span className="text-[10px] text-muted-foreground/50 shrink-0">
            {prompt.variables.length} vars
          </span>
        )}
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          {/* Variables */}
          {prompt.variables.length > 0 && (
            <div className="pt-3">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Template Variables
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {prompt.variables.map((v) => (
                  <code
                    key={v}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono"
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Prompt Text</Label>
              {isModifiedFromDefault && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Modified from default
                </span>
              )}
            </div>
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              rows={Math.min(20, Math.max(6, editedPrompt.split("\n").length + 2))}
              className="font-mono text-xs leading-relaxed resize-y"
              spellCheck={false}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={testPrompt}
              disabled={testing}
              variant="outline"
              className="h-8"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1.5" />
              )}
              Test
            </Button>
            <Button
              size="sm"
              onClick={savePrompt}
              disabled={saving || !hasChanges}
              className="h-8"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save as Default
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetPrompt}
              disabled={resetting || (!prompt.isCustomized && editedPrompt === prompt.defaultPrompt)}
              className="h-8 text-muted-foreground"
            >
              {resetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Reset to Default
            </Button>
          </div>

          {/* Test result */}
          {testError && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{testError}</p>
              </div>
            </div>
          )}
          {testResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Model: {testResult.model}</span>
                {testResult.tokensUsed && <span>| Tokens: {testResult.tokensUsed}</span>}
              </div>
              <div className="p-3 rounded-xl bg-muted/30 text-sm whitespace-pre-wrap max-h-80 overflow-y-auto">
                {testResult.output}
              </div>
              {/* Interpolated prompt preview */}
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                  View interpolated prompt
                </summary>
                <pre className="mt-2 p-3 rounded-xl bg-muted/20 whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto">
                  {testResult.interpolatedPrompt}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — PLATFORMS
// ═══════════════════════════════════════════════════════════════════

function PlatformsTab() {
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "" });

  const fetchPlatforms = useCallback(() => {
    fetch("/api/platforms/connect")
      .then((r) => r.json())
      .then(setPlatforms)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const connect = async (platform: string) => {
    if (!form.username || !form.password) {
      toast.error("Username and password required");
      return;
    }
    setConnecting(platform);
    try {
      const res = await fetch("/api/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, ...form }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Connected to ${platformInfo[platform].name}`);
      setDialogOpen(null);
      setForm({ username: "", password: "" });
      fetchPlatforms();
    } catch {
      toast.error("Failed to connect");
    }
    setConnecting(null);
  };

  const disconnect = async (platform: string) => {
    if (!confirm(`Disconnect from ${platformInfo[platform].name}?`)) return;
    try {
      await fetch(`/api/platforms/connect?platform=${platform}`, {
        method: "DELETE",
      });
      toast.success(`Disconnected from ${platformInfo[platform].name}`);
      fetchPlatforms();
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const connectedCount = platforms.filter((p) => p.connected).length;

  return (
    <div className="space-y-4 pt-2">
      {/* Connection summary */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Platform Connections</h3>
              <p className="text-sm text-muted-foreground">
                {connectedCount} of 8 platforms connected
              </p>
            </div>
            <div className="flex gap-1">
              {platforms.map((p) => (
                <div
                  key={p.platform}
                  className={`w-2.5 h-2.5 rounded-full ${
                    p.connected ? "bg-green-500" : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform list */}
      <div className="space-y-3">
        {platforms.map((p) => {
          const info = platformInfo[p.platform];
          if (!info) return null;
          return (
            <Card key={p.platform} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl ${info.bg} ${info.color} flex items-center justify-center font-bold`}
                    >
                      {info.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{info.name}</p>
                      {p.connected ? (
                        <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Connected
                          {p.updatedAt && (
                            <span className="text-muted-foreground ml-1">
                              · {new Date(p.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" />
                          Not connected
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {p.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnect(p.platform)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    ) : (
                      <Dialog
                        open={dialogOpen === p.platform}
                        onOpenChange={(open) => {
                          setDialogOpen(open ? p.platform : null);
                          if (!open) setForm({ username: "", password: "" });
                        }}
                      >
                        <DialogTrigger render={<Button size="sm" className="bg-primary text-primary-foreground" />}>
                            <Link2 className="h-4 w-4 mr-1" />
                            Connect
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg ${info.bg} ${info.color} flex items-center justify-center font-bold text-sm`}
                              >
                                {info.icon}
                              </div>
                              Connect to {info.name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label>Username / Email</Label>
                              <Input
                                value={form.username}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, username: e.target.value }))
                                }
                                placeholder={`Your ${info.name} username`}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Password</Label>
                              <Input
                                type="password"
                                value={form.password}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, password: e.target.value }))
                                }
                                placeholder="Password"
                                className="h-11"
                              />
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                              <Key className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground">
                                Your credentials are encrypted with AES-256-GCM and stored locally on
                                your machine. They are never sent to any external server.
                              </p>
                            </div>
                            <Button
                              className="w-full h-11 bg-primary text-primary-foreground"
                              onClick={() => connect(p.platform)}
                              disabled={connecting === p.platform}
                            >
                              {connecting === p.platform && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              )}
                              Save & Connect
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 4 — GENERAL
// ═══════════════════════════════════════════════════════════════════

function GeneralTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [defaultCondition, setDefaultCondition] = useState("Good");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [listingExpiry, setListingExpiry] = useState("30");
  const [themeColor, setThemeColor] = useState("teal");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.default_condition) setDefaultCondition(data.default_condition);
        if (data.default_category) setDefaultCategory(data.default_category);
        if (data.currency) setCurrency(data.currency);
        if (data.listing_expiry_days) setListingExpiry(data.listing_expiry_days);
        setThemeColor(getSavedThemeFromStorage());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            default_condition: defaultCondition,
            default_category: defaultCategory,
            currency,
            listing_expiry_days: listingExpiry,
            theme_color: themeColor,
          },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("General settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const conditions = ["New with tags", "Like new", "Good", "Fair", "Poor"];
  const categories = [
    "", "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories",
    "Dresses", "Activewear", "Bags", "Jewelry", "Streetwear",
    "Vintage", "Designer", "Sportswear", "Other",
  ];
  const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];

  const handleApplyTheme = (colorId: string) => {
    setThemeColor(colorId);
    const isDark = document.documentElement.classList.contains("dark");
    applyThemeFromLib(colorId, isDark);
    saveThemeToStorage(colorId);
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Theme Color */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Accent Color
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Choose the primary accent color used across the entire platform
          </p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {Object.entries(THEME_MAP).map(([id, theme]) => (
              <button
                key={id}
                onClick={() => handleApplyTheme(id)}
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className={`relative h-10 w-10 rounded-xl transition-all duration-200 group-hover:scale-110 group-hover:shadow-md ${
                    themeColor === id ? "ring-2 ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={{
                    backgroundColor: theme.light,
                    boxShadow: themeColor === id ? `0 0 0 2px var(--background), 0 0 0 4px ${theme.light}` : undefined,
                  }}
                >
                  {themeColor === id && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-sm" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{theme.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Listing Defaults */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Listing Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Condition */}
            <div className="space-y-2">
              <Label>Default Condition</Label>
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDefaultCondition(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      defaultCondition === c
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Category */}
            <div className="space-y-2">
              <Label>Default Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 8).map((c) => (
                  <button
                    key={c || "__none__"}
                    onClick={() => setDefaultCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      defaultCategory === c
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {c || "None"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <div className="flex flex-wrap gap-1.5">
              {currencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currency === c
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Listing Expiry */}
          <div className="space-y-2">
            <Label>Auto-stale after (days)</Label>
            <p className="text-xs text-muted-foreground">
              Listings older than this will be flagged for repricing
            </p>
            <Input
              type="number"
              value={listingExpiry}
              onChange={(e) => setListingExpiry(e.target.value)}
              min={1}
              max={365}
              className="h-11 w-32"
            />
          </div>

          <Button onClick={save} disabled={saving} className="h-10">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">About ListBlitz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">ListBlitz</span> — AI-Powered Cross-Platform Listing Tool
            </p>
            <p>List once, sell everywhere. Optimized for Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook Marketplace, and Vestiaire Collective.</p>
            <p className="text-xs">Version 0.1.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
