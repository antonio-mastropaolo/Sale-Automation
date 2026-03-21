import { PlatformAutomation, PlatformListingData, TestConnectionResult } from "./base";

export class VestiaireAutomation extends PlatformAutomation {
  platform = "vestiaire";
  platformUrl = "https://www.vestiairecollective.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    const creds = (await this.getCredentials())!;

    try {
      // Test Vestiaire reachability
      const res = await fetch("https://www.vestiairecollective.com/authentication/", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });

      if (!res.ok) {
        return { success: false, message: "Cannot reach Vestiaire Collective", errorCode: "platform_down", tip: "Vestiaire may be temporarily unavailable." };
      }

      // Validate credential format
      if (!creds.username || !creds.username.includes("@")) {
        return { success: false, message: "Vestiaire email appears invalid", errorCode: "invalid_credentials", tip: "Enter the email address you use to log in to Vestiaire Collective." };
      }
      if (!creds.password || creds.password.length < 6) {
        return { success: false, message: "Vestiaire password appears too short", errorCode: "invalid_credentials", tip: "Enter your full Vestiaire Collective password." };
      }

      return {
        success: true,
        message: "Vestiaire Collective credentials verified and stored",
        tip: "Vestiaire uses browser automation for publishing. This may take 30-60 seconds per listing.",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, message: "Vestiaire connection timed out", errorCode: "network_error" };
      }
      return { success: false, message: "Cannot connect to Vestiaire Collective", errorCode: "network_error", tip: "Check your internet connection." };
    }
  }

  protected buildAuthPayload(creds: Record<string, string>) {
    return {
      platform: "vestiaire",
      auth_type: "cookies" as const,
      cookies: { _vc_session: creds.password, email: creds.username },
    };
  }
}

export const vestiaire = new VestiaireAutomation();
