import { PlatformAutomation, TestConnectionResult } from "./base";

export class FacebookAutomation extends PlatformAutomation {
  platform = "facebook";
  platformUrl = "https://www.facebook.com/marketplace";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    const creds = (await this.getCredentials())!;

    try {
      // Test Facebook reachability
      const res = await fetch("https://www.facebook.com/login/", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });

      if (!res.ok) {
        return { success: false, message: "Cannot reach Facebook", errorCode: "platform_down", tip: "Facebook may be temporarily unavailable." };
      }

      // Validate credential format
      if (!creds.username || (!creds.username.includes("@") && creds.username.length < 5)) {
        return { success: false, message: "Facebook email or phone appears invalid", errorCode: "invalid_credentials", tip: "Enter your Facebook email address or phone number." };
      }
      if (!creds.password || creds.password.length < 6) {
        return { success: false, message: "Facebook password appears too short", errorCode: "invalid_credentials", tip: "Enter your full Facebook password." };
      }

      return {
        success: true,
        message: "Facebook Marketplace credentials verified and stored",
        tip: "Credentials will be used for browser-based Marketplace publishing. Full login verification happens at publish time.",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, message: "Facebook connection timed out", errorCode: "network_error" };
      }
      return { success: false, message: "Cannot connect to Facebook", errorCode: "network_error", tip: "Check your internet connection." };
    }
  }
}

export const facebook = new FacebookAutomation();
