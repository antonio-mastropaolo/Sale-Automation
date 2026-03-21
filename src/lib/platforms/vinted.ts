import { PlatformAutomation, PlatformListingData, TestConnectionResult } from "./base";

export class VintedAutomation extends PlatformAutomation {
  platform = "vinted";
  platformUrl = "https://www.vinted.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    const creds = (await this.getCredentials())!;

    // Check if token format (API key mode: access_key,signing_key)
    const isApiKey = creds.password && creds.password.includes(",");

    if (isApiKey) {
      const parts = creds.password.split(",");
      if (parts.length !== 2 || parts[0].trim().length < 5 || parts[1].trim().length < 5) {
        return { success: false, message: "Invalid Vinted Pro API key format", errorCode: "invalid_credentials", tip: "Format should be: access_key,signing_key (comma separated)." };
      }

      // Test Vinted API reachability
      try {
        const res = await fetch("https://www.vinted.com/api/v2/users/current", {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Authorization": `Bearer ${parts[0].trim()}`,
          },
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          return { success: true, message: "Vinted Pro API token is valid" };
        }
        if (res.status === 401) {
          return { success: false, message: "Vinted API token is expired or invalid", errorCode: "invalid_credentials", tip: "Generate a new API token from your Vinted Pro dashboard." };
        }
        // Non-401 errors — token stored, will verify at publish
        return { success: true, message: "Vinted Pro API token stored", tip: "Token will be fully verified when publishing." };
      } catch {
        return { success: true, message: "Vinted Pro API token stored (API unreachable for verification)", tip: "Token format looks valid. Will verify at publish time." };
      }
    }

    // Standard username/password mode
    try {
      const res = await fetch("https://www.vinted.com", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return { success: false, message: "Cannot reach Vinted login page", errorCode: "platform_down", tip: "Vinted may be temporarily unavailable." };
      }

      if (!creds.username || creds.username.length < 3) {
        return { success: false, message: "Vinted email appears invalid", errorCode: "invalid_credentials", tip: "Enter your Vinted email address." };
      }

      return {
        success: true,
        message: "Vinted credentials stored securely",
        tip: "For full API access, consider using your Vinted Pro access_key,signing_key as the password field.",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, message: "Vinted connection timed out", errorCode: "network_error" };
      }
      return { success: false, message: "Cannot connect to Vinted", errorCode: "network_error", tip: "Check your internet connection." };
    }
  }

  protected buildAuthPayload(creds: Record<string, string>) {
    return {
      platform: "vinted",
      auth_type: "api_key" as const,
      token: creds.password,
    };
  }
}

export const vinted = new VintedAutomation();
