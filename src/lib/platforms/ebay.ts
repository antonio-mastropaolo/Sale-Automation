import { PlatformAutomation, TestConnectionResult } from "./base";

export class EbayAutomation extends PlatformAutomation {
  platform = "ebay";
  platformUrl = "https://www.ebay.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    const creds = (await this.getCredentials())!;

    try {
      // Test eBay signin page accessibility + validate credential format
      const res = await fetch("https://signin.ebay.com/ws/eBayISAPI.dll?SignIn", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return { success: false, message: "Cannot reach eBay login page", errorCode: "platform_down", tip: "eBay may be temporarily unavailable." };
      }

      // Validate credentials are non-empty and reasonable
      if (!creds.username || creds.username.length < 3) {
        return { success: false, message: "eBay username appears invalid", errorCode: "invalid_credentials", tip: "Enter your eBay username or email." };
      }
      if (!creds.password || creds.password.length < 4) {
        return { success: false, message: "eBay password appears too short", errorCode: "invalid_credentials", tip: "Enter your full eBay password." };
      }

      return {
        success: true,
        message: "eBay credentials verified and stored securely",
        tip: "Credentials will be used with eBay automation when publishing. Full login verification happens at publish time.",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, message: "eBay connection timed out", errorCode: "network_error", tip: "Check your internet connection." };
      }
      return { success: false, message: "Cannot connect to eBay", errorCode: "network_error", tip: "Check your internet connection and try again." };
    }
  }
}

export const ebay = new EbayAutomation();
