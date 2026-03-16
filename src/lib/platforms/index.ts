import { PlatformAutomation } from "./base";
import { depop } from "./depop";
import { grailed } from "./grailed";
import { poshmark } from "./poshmark";
import { mercari } from "./mercari";
import { vinted } from "./vinted";
import { vestiaire } from "./vestiaire";

export const platforms: Record<string, PlatformAutomation> = {
  depop,
  grailed,
  poshmark,
  mercari,
  vinted,
  vestiaire,
};

export type { PlatformListingData, TestConnectionResult } from "./base";
