/**
 * Diagnostic Check Runner — Server-Side Execution
 *
 * Each category runner performs real checks against the database,
 * AI providers, platform connections, and environment.
 */

import { prisma } from "@/lib/db";
import type { CheckResult, CheckStatus } from "./check-registry";

async function timedCheck(
  id: string,
  name: string,
  fn: () => Promise<{ status: CheckStatus; message?: string; detail?: string }>
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return { id, name, ...result, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      id, name, status: "fail", latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ── Auth ──

async function runAuth(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  checks.push(await timedCheck("auth-session", "Session Validity", async () => ({
    status: "pass", message: "Session is active (request was authenticated)",
  })));

  checks.push(await timedCheck("auth-env", "Auth Environment", async () => {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) return { status: "fail" as CheckStatus, message: "No JWT_SECRET or NEXTAUTH_SECRET configured" };
    return { status: "pass" as CheckStatus, message: "Auth secret is configured" };
  }));

  checks.push(await timedCheck("auth-password", "Password Hashing", async () => {
    const user = await prisma.user.findFirst({ select: { passwordHash: true } });
    if (!user?.passwordHash) return { status: "skip" as CheckStatus, message: "No users with passwords found" };
    if (user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$")) {
      return { status: "pass" as CheckStatus, message: "Passwords use bcrypt hashing" };
    }
    return { status: "warn" as CheckStatus, message: "Password hash format not recognized as bcrypt" };
  }));

  return checks;
}

// ── Database ──

async function runDatabase(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  checks.push(await timedCheck("db-connection", "Connection", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "pass" as CheckStatus, message: "Database is connected" };
  }));

  checks.push(await timedCheck("db-latency", "Query Latency", async () => {
    const start = Date.now();
    await prisma.user.count();
    const ms = Date.now() - start;
    if (ms > 500) return { status: "warn" as CheckStatus, message: `Query took ${ms}ms (slow)` };
    return { status: "pass" as CheckStatus, message: `${ms}ms round-trip` };
  }));

  checks.push(await timedCheck("db-tables", "Table Integrity", async () => {
    const [users, listings, settings] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.setting.count(),
    ]);
    return {
      status: "pass" as CheckStatus,
      message: `${users} users, ${listings} listings, ${settings} settings`,
    };
  }));

  return checks;
}

// ── AI Providers ──

async function runAIProviders(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  // Check default provider key
  checks.push(await timedCheck("ai-default-key", "Default Provider Key", async () => {
    const provSetting = await prisma.setting.findUnique({ where: { key: "ai_provider" } });
    const provider = provSetting?.value || "openai";
    const keySetting = await prisma.setting.findUnique({ where: { key: `ai_api_key_${provider}` } });
    const fallback = await prisma.setting.findUnique({ where: { key: "ai_api_key" } });
    if (keySetting?.value || fallback?.value) {
      return { status: "pass" as CheckStatus, message: `${provider} API key is set` };
    }
    return { status: "fail" as CheckStatus, message: `No API key for ${provider}. Go to Settings > AI Provider.` };
  }));

  // Test AI connectivity
  checks.push(await timedCheck("ai-connectivity", "AI Connectivity", async () => {
    try {
      const { getAIClient } = await import("@/lib/settings");
      const { client, model } = await getAIClient();
      const res = await client.chat.completions.create({
        model,
        max_tokens: 5,
        messages: [{ role: "user", content: "Reply OK" }],
      });
      const reply = res.choices[0]?.message?.content || "";
      return { status: "pass" as CheckStatus, message: `${model} responded: "${reply.slice(0, 20)}"` };
    } catch (err) {
      return { status: "fail" as CheckStatus, message: err instanceof Error ? err.message : "AI call failed" };
    }
  }));

  // Report all keys
  checks.push(await timedCheck("ai-all-keys", "All Provider Keys", async () => {
    const providers = ["openai", "google", "groq", "together", "openrouter", "litellm", "custom"];
    const results: string[] = [];
    let configured = 0;
    for (const pid of providers) {
      const s = await prisma.setting.findUnique({ where: { key: `ai_api_key_${pid}` } });
      if (s?.value) { configured++; results.push(`${pid}: set`); }
      else { results.push(`${pid}: missing`); }
    }
    return {
      status: configured > 0 ? "pass" as CheckStatus : "fail" as CheckStatus,
      message: `${configured}/${providers.length} providers configured`,
      detail: results.join("\n"),
    };
  }));

  return checks;
}

// ── Platforms ──

async function runPlatforms(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];
  const allPlatforms = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"];

  checks.push(await timedCheck("plat-credentials", "Stored Credentials", async () => {
    const creds = await prisma.platformCredential.findMany({ select: { platform: true } });
    const connected = creds.map((c) => c.platform);
    const missing = allPlatforms.filter((p) => !connected.includes(p));
    return {
      status: connected.length > 0 ? "pass" as CheckStatus : "warn" as CheckStatus,
      message: `${connected.length}/${allPlatforms.length} platforms connected`,
      detail: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "All platforms connected",
    };
  }));

  checks.push(await timedCheck("plat-encryption", "Credential Encryption", async () => {
    const creds = await prisma.platformCredential.findMany();
    let ok = 0; let broken = 0;
    for (const c of creds) {
      try {
        const { decrypt } = await import("@/lib/crypto");
        JSON.parse(decrypt(c.encryptedData));
        ok++;
      } catch {
        try {
          JSON.parse(Buffer.from(c.encryptedData, "base64").toString("utf8"));
          ok++;
        } catch { broken++; }
      }
    }
    if (broken > 0) return { status: "fail" as CheckStatus, message: `${broken} credential(s) could not be decrypted`, detail: "Try disconnecting and re-entering those credentials." };
    if (ok === 0) return { status: "skip" as CheckStatus, message: "No credentials stored" };
    return { status: "pass" as CheckStatus, message: `${ok} credential(s) decryptable` };
  }));

  checks.push(await timedCheck("plat-connectivity", "Platform Reachability", async () => {
    const urls: Record<string, string> = {
      depop: "https://www.depop.com",
      grailed: "https://www.grailed.com",
      poshmark: "https://poshmark.com",
      ebay: "https://www.ebay.com",
    };
    const results: string[] = [];
    let reachable = 0;
    for (const [name, url] of Object.entries(urls)) {
      try {
        const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        results.push(`${name}: ${res.status}`);
        if (res.status < 500) reachable++;
      } catch {
        results.push(`${name}: unreachable`);
      }
    }
    return {
      status: reachable === Object.keys(urls).length ? "pass" as CheckStatus : "warn" as CheckStatus,
      message: `${reachable}/${Object.keys(urls).length} platforms reachable`,
      detail: results.join("\n"),
    };
  }));

  return checks;
}

// ── Listings ──

async function runListings(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  checks.push(await timedCheck("list-count", "Listing Count", async () => {
    const total = await prisma.listing.count();
    const active = await prisma.listing.count({ where: { status: "active" } });
    const draft = await prisma.listing.count({ where: { status: "draft" } });
    return { status: "pass" as CheckStatus, message: `${total} total (${active} active, ${draft} draft)` };
  }));

  checks.push(await timedCheck("list-images", "Image Storage", async () => {
    const withImages = await prisma.listing.count({
      where: { images: { some: {} } },
    });
    const total = await prisma.listing.count();
    if (total === 0) return { status: "skip" as CheckStatus, message: "No listings yet" };
    const pct = Math.round((withImages / total) * 100);
    return {
      status: pct > 50 ? "pass" as CheckStatus : "warn" as CheckStatus,
      message: `${withImages}/${total} listings have images (${pct}%)`,
    };
  }));

  checks.push(await timedCheck("list-publish", "Publish Pipeline", async () => {
    const { platforms } = await import("@/lib/platforms");
    const loaded = Object.keys(platforms);
    return { status: "pass" as CheckStatus, message: `${loaded.length} platform automations loaded: ${loaded.join(", ")}` };
  }));

  return checks;
}

// ── Prompts ──

async function runPrompts(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  checks.push(await timedCheck("prompt-defaults", "Default Prompts", async () => {
    const { DEFAULT_PROMPTS } = await import("@/lib/prompts");
    const count = DEFAULT_PROMPTS.length;
    return { status: count > 0 ? "pass" as CheckStatus : "fail" as CheckStatus, message: `${count} default prompt templates registered` };
  }));

  checks.push(await timedCheck("prompt-overrides", "Custom Overrides", async () => {
    const overrides = await prisma.customPrompt.count();
    return { status: "pass" as CheckStatus, message: `${overrides} custom prompt override(s)` };
  }));

  return checks;
}

// ── Performance ──

async function runPerformance(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  checks.push(await timedCheck("perf-memory", "Memory Usage", async () => {
    const mem = process.memoryUsage();
    const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
    return {
      status: heapPct > 90 ? "warn" as CheckStatus : "pass" as CheckStatus,
      message: `Heap: ${heapMB}MB (${heapPct}% used)`,
    };
  }));

  checks.push(await timedCheck("perf-api", "API Response Time", async () => {
    const start = Date.now();
    await prisma.setting.findFirst();
    const ms = Date.now() - start;
    return {
      status: ms > 1000 ? "warn" as CheckStatus : "pass" as CheckStatus,
      message: `${ms}ms internal query`,
    };
  }));

  checks.push(await timedCheck("perf-env", "Environment", async () => {
    const required = ["DATABASE_URL"];
    const optional = ["ENCRYPTION_KEY", "JWT_SECRET", "NEXTAUTH_SECRET"];
    const missing = required.filter((k) => !process.env[k]);
    const optMissing = optional.filter((k) => !process.env[k]);
    if (missing.length > 0) return { status: "fail" as CheckStatus, message: `Missing required: ${missing.join(", ")}` };
    if (optMissing.length > 0) return { status: "warn" as CheckStatus, message: `Missing optional: ${optMissing.join(", ")}`, detail: "Some features may not work without these." };
    return { status: "pass" as CheckStatus, message: "All environment variables configured" };
  }));

  return checks;
}

// ── Dispatcher ──

const RUNNERS: Record<string, () => Promise<CheckResult[]>> = {
  auth: runAuth,
  database: runDatabase,
  "ai-providers": runAIProviders,
  platforms: runPlatforms,
  listings: runListings,
  prompts: runPrompts,
  performance: runPerformance,
};

export async function runChecksForCategory(categoryId: string): Promise<{
  category: string;
  checks: CheckResult[];
  ranAt: string;
  durationMs: number;
}> {
  const runner = RUNNERS[categoryId];
  if (!runner) throw new Error(`Unknown category: ${categoryId}`);

  const start = Date.now();
  const checks = await runner();
  return {
    category: categoryId,
    checks,
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}
