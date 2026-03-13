import { PlatformAutomation, PlatformListingData } from "./base";

export class MercariAutomation extends PlatformAutomation {
  platform = "mercari";

  async publish(data: PlatformListingData): Promise<{ url: string }> {
    const creds = await this.getCredentials();
    if (!creds) throw new Error("Mercari credentials not configured");

    // Playwright automation placeholder
    // In production, this would:
    // 1. Launch browser with stored cookies
    // 2. Navigate to mercari.com/sell
    // 3. Upload images
    // 4. Fill in title, description, category, condition
    // 5. Set price and shipping
    // 6. Submit listing
    console.log(`[Mercari] Would publish: ${data.title} at $${data.price}`);

    return { url: `https://www.mercari.com/listing/placeholder-${Date.now()}` };
  }
}

export const mercari = new MercariAutomation();
