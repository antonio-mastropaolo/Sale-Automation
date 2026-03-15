import { PlatformAutomation, PlatformListingData, TestConnectionResult } from "./base";

export class PoshmarkAutomation extends PlatformAutomation {
  platform = "poshmark";
  platformUrl = "https://poshmark.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    const creds = (await this.getCredentials())!;

    try {
      // Poshmark has a known API endpoint for login
      const res = await fetch("https://poshmark.com/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        body: JSON.stringify({ login: creds.username, password: creds.password }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        return { success: true, message: "Successfully authenticated with Poshmark" };
      }

      const status = res.status;
      if (status === 401 || status === 403) {
        let detail = "";
        try { const body = await res.json(); detail = body.error?.message || body.error || ""; } catch { /* ignore */ }
        const lower = (typeof detail === "string" ? detail : "").toLowerCase();

        if (lower.includes("verify") || lower.includes("captcha")) {
          return { success: false, message: "Poshmark requires verification", errorCode: "two_factor", tip: "Log in to Poshmark on your phone first to complete any verification, then test again." };
        }
        return { success: false, message: "Poshmark rejected your credentials", errorCode: "invalid_credentials", tip: "Check your username/email and password. If you signed up with Google/Facebook, set a password in Poshmark settings." };
      }
      if (status === 429) {
        return { success: false, message: "Too many login attempts on Poshmark", errorCode: "network_error", tip: "Wait a few minutes before testing again." };
      }
      return { success: false, message: `Poshmark returned HTTP ${status}`, errorCode: "platform_down", tip: "Poshmark may be experiencing issues." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, message: "Poshmark login timed out", errorCode: "network_error", tip: "Try again in a moment." };
      }
      return { success: false, message: "Could not reach Poshmark", errorCode: "network_error", tip: "Check your internet connection." };
    }
  }

  async publish(data: PlatformListingData): Promise<{ url: string }> {
    const creds = await this.getCredentials();
    if (!creds) throw new Error("Poshmark credentials not configured");
    console.log(`[Poshmark] Would publish: ${data.title} at $${data.price}`);
    return { url: `https://poshmark.com/listing/placeholder-${Date.now()}` };
  }
}

export const poshmark = new PoshmarkAutomation();
