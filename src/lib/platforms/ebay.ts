import { PlatformAutomation, TestConnectionResult } from "./base";

export class EbayAutomation extends PlatformAutomation {
  platform = "ebay";
  platformUrl = "https://www.ebay.com";

  async testConnection(): Promise<TestConnectionResult> {
    const baseResult = await super.testConnection();
    if (!baseResult.success) return baseResult;
    return {
      success: true,
      message: "eBay credentials stored securely",
      tip: "Credentials will be used with the eBay API when publishing.",
    };
  }

  // publish() inherited from base class — delegates to FastAPI backend
}

export const ebay = new EbayAutomation();
