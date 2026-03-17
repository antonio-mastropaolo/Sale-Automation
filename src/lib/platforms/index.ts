import { PlatformAutomation } from "./base";
import { depop } from "./depop";
import { grailed } from "./grailed";
import { poshmark } from "./poshmark";
import { mercari } from "./mercari";
import { vinted } from "./vinted";
import { vestiaire } from "./vestiaire";
import { ebay } from "./ebay";
import { facebook } from "./facebook";

export const platforms: Record<string, PlatformAutomation> = {
  depop,
  grailed,
  poshmark,
  mercari,
  ebay,
  vinted,
  facebook,
  vestiaire,
};

export type { PlatformListingData, TestConnectionResult } from "./base";
