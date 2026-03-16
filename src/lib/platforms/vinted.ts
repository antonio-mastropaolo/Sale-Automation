import { PlatformAutomation, PlatformListingData, TestConnectionResult } from "./base";

export class VintedAutomation extends PlatformAutomation {
  platform = "vinted";
  platformUrl = "https://www.vinted.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;

    // Vinted Pro API requires an access token, not username/password.
    // We validate that a token is stored.
    const creds = (await this.getCredentials())!;
    if (creds.password && creds.password.includes(",")) {
      // Token format: access_key,signing_key
      return { success: true, message: "Vinted Pro API token stored and ready" };
    }

    return {
      success: true,
      message: "Credentials stored for Vinted",
      tip: "For full API access, use your Vinted Pro access_key,signing_key as the password field.",
    };
  }

  // publish() inherited — proxies to FastAPI VintedApiConnector (official Pro API)

  protected buildAuthPayload(creds: Record<string, string>) {
    // Vinted Pro API uses HMAC token: "access_key,signing_key"
    return {
      platform: "vinted",
      auth_type: "api_key" as const,
      token: creds.password, // access_key,signing_key
    };
  }
}

export const vinted = new VintedAutomation();
