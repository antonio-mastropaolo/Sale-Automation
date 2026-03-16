import { PlatformAutomation, PlatformListingData, TestConnectionResult } from "./base";

export class PoshmarkAutomation extends PlatformAutomation {
  platform = "poshmark";
  platformUrl = "https://poshmark.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    const creds = (await this.getCredentials())!;

    try {
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
          return { success: false, message: "Poshmark requires verification", errorCode: "two_factor", tip: "Log in to Poshmark on your phone first to complete verification." };
        }
        return { success: false, message: "Poshmark rejected your credentials", errorCode: "invalid_credentials", tip: "Check your username/email and password." };
      }
      if (status === 429) {
        return { success: false, message: "Too many login attempts on Poshmark", errorCode: "network_error", tip: "Wait a few minutes." };
      }
      return { success: false, message: `Poshmark returned HTTP ${status}`, errorCode: "platform_down" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, message: "Poshmark login timed out", errorCode: "network_error", tip: "Try again." };
      }
      return { success: false, message: "Could not reach Poshmark", errorCode: "network_error" };
    }
  }

  // publish() inherited — proxies to FastAPI PoshmarkBrowserConnector

  protected buildAuthPayload(creds: Record<string, string>) {
    return {
      platform: "poshmark",
      auth_type: "cookies" as const,
      cookies: { _poshmark_session: creds.password, email: creds.username },
    };
  }
}

export const poshmark = new PoshmarkAutomation();
