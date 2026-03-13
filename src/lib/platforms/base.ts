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

export abstract class PlatformAutomation {
  abstract platform: string;

  async getCredentials(): Promise<Record<string, string> | null> {
    const cred = await prisma.platformCredential.findUnique({
      where: { platform: this.platform },
    });
    if (!cred) return null;
    try {
      return JSON.parse(decrypt(cred.encryptedData));
    } catch {
      return null;
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

  abstract publish(data: PlatformListingData): Promise<{ url: string }>;
}
