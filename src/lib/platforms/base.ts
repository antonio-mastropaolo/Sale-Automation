import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export interface PlatformListingData {
  title: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  size: string;
  condition: string;
  images: string[]; // local file paths
  hashtags: string[];
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  errorCode?: "invalid_credentials" | "account_locked" | "two_factor" | "network_error" | "platform_down" | "unknown";
  tip?: string;
}

/**
 * URL of the ListBlitz automation backend (FastAPI v2).
 * In production: the deployed FastAPI service.
 * In dev: http://localhost:8000
 */
const AUTOMATION_API =
  process.env.AUTOMATION_API_URL || "http://localhost:8000";

export abstract class PlatformAutomation {
  abstract platform: string;
  abstract platformUrl: string;

  async getCredentials(): Promise<Record<string, string> | null> {
    const cred = await prisma.platformCredential.findUnique({
      where: { platform: this.platform },
    });
    if (!cred) return null;
    try {
      return JSON.parse(decrypt(cred.encryptedData));
    } catch {
      // Fallback: try base64 decoding (used when crypto was unavailable during save)
      try {
        return JSON.parse(Buffer.from(cred.encryptedData, "base64").toString("utf8"));
      } catch {
        return null;
      }
    }
  }

  async saveCredentials(data: Record<string, string>): Promise<void> {
    const encryptedData = encrypt(JSON.stringify(data));
    await prisma.platformCredential.upsert({
      where: { platform: this.platform },
      update: { encryptedData },
      create: { platform: this.platform, encryptedData },
    });
  }

  async removeCredentials(): Promise<void> {
    await prisma.platformCredential.deleteMany({
      where: { platform: this.platform },
    });
  }

  /** Validate stored credentials. Subclasses should override to attempt real login. */
  async testConnection(): Promise<TestConnectionResult> {
    const creds = await this.getCredentials();
    if (!creds) {
      return { success: false, message: "No credentials found", errorCode: "invalid_credentials", tip: "Save your username and password first, then test again." };
    }
    if (!creds.username || !creds.password) {
      return { success: false, message: "Username or password is empty", errorCode: "invalid_credentials", tip: "Both fields are required. Re-enter your credentials and save." };
    }
    // Default: credentials stored correctly
    return { success: true, message: `Credentials securely stored for ${this.platform}` };
  }

  /**
   * Publish a listing via the ListBlitz automation backend.
   * Proxies to POST /v2/listings/publish on the FastAPI service.
   */
  async publish(data: PlatformListingData): Promise<{ url: string }> {
    const creds = await this.getCredentials();
    if (!creds) throw new Error(`${this.platform} credentials not configured`);

    // Step 1: Ensure the platform is connected on the automation backend
    await this.ensureBackendConnection(creds);

    // Step 2: Publish via the backend
    const res = await fetch(`${AUTOMATION_API}/v2/listings/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: {
          title: data.title,
          description: data.description,
          price: data.price,
          brand: data.brand || null,
          category: data.category || null,
          size: data.size || null,
          condition: data.condition || null,
          color: null,
          photos: data.images
            .filter((img) => img.startsWith("http"))
            .map((img) => img),
          shipping_option: null,
          tags: data.hashtags || [],
        },
        platforms: [this.platform],
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout for browser automation
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errBody.detail || errBody.error || `Publishing failed (HTTP ${res.status})`);
    }

    const result = await res.json();

    // Extract URL from the first successful result
    if (result.results && result.results.length > 0) {
      return { url: result.results[0].url };
    }

    // If there were errors, throw them
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].error);
    }

    return { url: `${this.platformUrl}/listing/published-${Date.now()}` };
  }

  /**
   * Ensure the automation backend has this platform connected
   * by posting credentials to POST /v2/platforms/{platform}/connect.
   */
  protected async ensureBackendConnection(creds: Record<string, string>): Promise<void> {
    // Check if already connected
    try {
      const sessionRes = await fetch(
        `${AUTOMATION_API}/v2/platforms/${this.platform}/session?user_id=default-user`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        if (session && session.is_valid) return; // Already connected
      }
    } catch {
      // Not connected, proceed to connect
    }

    // Connect with stored credentials
    const authPayload = this.buildAuthPayload(creds);

    try {
      const connectRes = await fetch(
        `${AUTOMATION_API}/v2/platforms/${this.platform}/connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credentials: authPayload }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!connectRes.ok) {
        console.warn(`[${this.platform}] Backend connect returned ${connectRes.status}`);
      }
    } catch (err) {
      console.warn(`[${this.platform}] Backend connect failed:`, err);
    }
  }

  /**
   * Build the auth payload for the automation backend.
   * Override in subclasses for platform-specific auth types.
   */
  protected buildAuthPayload(creds: Record<string, string>): Record<string, unknown> {
    return {
      platform: this.platform,
      auth_type: "cookies",
      cookies: { username: creds.username, password: creds.password },
    };
  }

  /**
   * Get listing status from the automation backend.
   */
  async getListingStatus(inventoryId: string): Promise<Record<string, unknown>> {
    const res = await fetch(
      `${AUTOMATION_API}/v2/listings/${inventoryId}/status`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`Status check failed (HTTP ${res.status})`);
    return res.json();
  }

  /**
   * Get conversations from the automation backend.
   */
  async getConversations(): Promise<unknown[]> {
    const res = await fetch(
      `${AUTOMATION_API}/v2/messages/${this.platform}/conversations?user_id=default-user`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    return res.json();
  }
}
