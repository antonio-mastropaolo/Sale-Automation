import { PlatformAutomation, PlatformListingData, TestConnectionResult } from "./base";

export class DepopAutomation extends PlatformAutomation {
  platform = "depop";
  platformUrl = "https://www.depop.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    const creds = (await this.getCredentials())!;

    try {
      const res = await fetch("https://webapi.depop.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        body: JSON.stringify({ email: creds.username, password: creds.password }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        return { success: true, message: "Successfully authenticated with Depop" };
      }

      const status = res.status;
      if (status === 401 || status === 403) {
        let detail = "";
        try { const body = await res.json(); detail = body.error || body.message || ""; } catch { /* ignore */ }
        const lower = detail.toLowerCase();

        if (lower.includes("2fa") || lower.includes("two-factor") || lower.includes("verification")) {
          return { success: false, message: "Depop requires two-factor authentication", errorCode: "two_factor", tip: "Log in to Depop on your phone, disable 2FA temporarily, or use an app-specific password if available." };
        }
        if (lower.includes("locked") || lower.includes("suspended")) {
          return { success: false, message: "Your Depop account appears to be locked", errorCode: "account_locked", tip: "Log in to Depop directly to unlock your account, then try again." };
        }
        return { success: false, message: "Depop rejected your credentials", errorCode: "invalid_credentials", tip: "Double-check your email and password." };
      }
      if (status === 429) {
        return { success: false, message: "Too many login attempts", errorCode: "network_error", tip: "Wait a few minutes before testing again." };
      }
      return { success: false, message: `Depop returned HTTP ${status}`, errorCode: "platform_down", tip: "Depop may be experiencing issues." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, message: "Depop login timed out", errorCode: "network_error", tip: "Try again in a moment." };
      }
      return { success: false, message: "Could not reach Depop", errorCode: "network_error", tip: "Check your server's internet connection." };
    }
  }

  // publish() is inherited from base — proxies to FastAPI v2 backend
  // which uses DepopApiConnector (official Selling API)

  protected buildAuthPayload(creds: Record<string, string>) {
    return {
      platform: "depop",
      auth_type: "bearer_token" as const,
      token: creds.password, // API key / bearer token
    };
  }
}

export const depop = new DepopAutomation();
