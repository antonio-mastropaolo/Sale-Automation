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

  abstract publish(data: PlatformListingData): Promise<{ url: string }>;
}
