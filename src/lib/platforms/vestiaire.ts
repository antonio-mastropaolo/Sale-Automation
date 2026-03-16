import { PlatformAutomation, PlatformListingData, TestConnectionResult } from "./base";

export class VestiaireAutomation extends PlatformAutomation {
  platform = "vestiaire";
  platformUrl = "https://www.vestiairecollective.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;

    // No official API — credentials are stored for browser automation
    return {
      success: true,
      message: "Credentials stored for Vestiaire Collective",
      tip: "Vestiaire uses browser automation. Publishing may take 30-60 seconds.",
    };
  }

  // publish() inherited — proxies to FastAPI VestiaireBrowserConnector

  protected buildAuthPayload(creds: Record<string, string>) {
    return {
      platform: "vestiaire",
      auth_type: "cookies" as const,
      cookies: { _vc_session: creds.password, email: creds.username },
    };
  }
}

export const vestiaire = new VestiaireAutomation();
