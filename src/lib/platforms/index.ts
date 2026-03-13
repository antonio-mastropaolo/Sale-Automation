import { PlatformAutomation } from "./base";
import { depop } from "./depop";
import { grailed } from "./grailed";
import { poshmark } from "./poshmark";
import { mercari } from "./mercari";

export const platforms: Record<string, PlatformAutomation> = {
  depop,
  grailed,
  poshmark,
  mercari,
};

export type { PlatformListingData } from "./base";
