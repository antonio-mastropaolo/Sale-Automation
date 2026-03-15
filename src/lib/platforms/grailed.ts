import { PlatformAutomation, PlatformListingData, TestConnectionResult } from "./base";

export class GrailedAutomation extends PlatformAutomation {
  platform = "grailed";
  platformUrl = "https://www.grailed.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    const creds = (await this.getCredentials())!;

    try {
      // Grailed uses a GraphQL/REST API for authentication
      const res = await fetch("https://www.grailed.com/api/sign_in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        body: JSON.stringify({ user: { email: creds.username, password: creds.password } }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        return { success: true, message: "Successfully authenticated with Grailed" };
      }

      const status = res.status;
      if (status === 401 || status === 422) {
        return { success: false, message: "Grailed rejected your credentials", errorCode: "invalid_credentials", tip: "Double-check your email and password. If you use Google/Apple sign-in, set a password in Grailed account settings." };
      }
      if (status === 429) {
        return { success: false, message: "Too many login attempts on Grailed", errorCode: "network_error", tip: "Wait a few minutes before testing again." };
      }
      return { success: false, message: `Grailed returned HTTP ${status}`, errorCode: "platform_down", tip: "Grailed may be experiencing issues. Try again later." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, message: "Grailed login timed out", errorCode: "network_error", tip: "Try again in a moment." };
      }
      return { success: false, message: "Could not reach Grailed", errorCode: "network_error", tip: "Check your server's internet connection." };
    }
  }

  async publish(data: PlatformListingData): Promise<{ url: string }> {
    const creds = await this.getCredentials();
    if (!creds) throw new Error("Grailed credentials not configured");
    console.log(`[Grailed] Would publish: ${data.title} at $${data.price}`);
    return { url: `https://www.grailed.com/listings/placeholder-${Date.now()}` };
  }
}

export const grailed = new GrailedAutomation();
