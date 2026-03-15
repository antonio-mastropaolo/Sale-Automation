// ── Platform Publishing Config Types & Defaults ──────────────────────

export interface DepopConfig {
  boostEnabled: boolean;
  boostPercent: number;        // 0-100, typically 8%
  bundleDiscount: number;      // 0-95%
  bundleShipping: "free" | "highest" | "combined";
  offersEnabled: boolean;
  minOfferPercent: number;     // e.g., 80 = accept offers at 80%+ of list price
}

export interface GrailedConfig {
  priceDropOnly: true;         // always true — Grailed only allows price decreases
  bumpAfterDays: number;       // auto-bump after N days (7 = free bump)
  offersEnabled: boolean;
  minOfferPercent: number;
}

export interface PoshmarkConfig {
  offerToLikers: boolean;
  offerDiscountPercent: number; // must be 10%+ for OTL
  shippingDiscount: number;    // seller-funded shipping discount in $
  closetSharingEnabled: boolean;
  bundleDiscount: number;
  partyTags: string[];
}

export interface MercariConfig {
  smartPricing: boolean;
  smartPriceFloor: number;     // minimum price for smart pricing
  promoteEnabled: boolean;     // requires 5%+ price drop
  offersToLikers: boolean;
  shippingPaidBy: "seller" | "buyer";
  shippingCarrier: "usps" | "fedex" | "ups";
}

export interface EbayConfig {
  listingFormat: "fixed" | "auction" | "auction_bin";
  auctionDuration: 1 | 3 | 5 | 7 | 10 | 30;
  bestOffer: boolean;
  autoAcceptPrice: number;
  autoDeclinePrice: number;
  promotedListing: boolean;
  promotedAdRate: number;      // 1-20%
  returnPolicy: "none" | "30day" | "60day";
  shippingType: "calculated" | "flat" | "free";
  flatShippingCost: number;
  conditionId: string;
}

export interface VintedConfig {
  shippingMethod: "vinted_shipping" | "custom";
  bundleDiscount: number;
  priceInclShipping: boolean;
}

export interface FacebookConfig {
  pickupAvailable: boolean;
  pickupLocation: string;
  shippingAvailable: boolean;
  boostListing: boolean;
}

export interface VestiaireConfig {
  conditionGrade: "never_worn" | "very_good" | "good" | "fair";
  hasAuthenticity: boolean;
  hasOriginalPackaging: boolean;
  hasReceipt: boolean;
}

// ── Defaults ──────────────────────────────────────────────────────────

export const DEFAULT_DEPOP: DepopConfig = {
  boostEnabled: false,
  boostPercent: 8,
  bundleDiscount: 10,
  bundleShipping: "highest",
  offersEnabled: true,
  minOfferPercent: 80,
};

export const DEFAULT_GRAILED: GrailedConfig = {
  priceDropOnly: true,
  bumpAfterDays: 7,
  offersEnabled: true,
  minOfferPercent: 80,
};

export const DEFAULT_POSHMARK: PoshmarkConfig = {
  offerToLikers: true,
  offerDiscountPercent: 20,
  shippingDiscount: 0,
  closetSharingEnabled: true,
  bundleDiscount: 15,
  partyTags: [],
};

export const DEFAULT_MERCARI: MercariConfig = {
  smartPricing: false,
  smartPriceFloor: 0,
  promoteEnabled: false,
  offersToLikers: true,
  shippingPaidBy: "buyer",
  shippingCarrier: "usps",
};

export const DEFAULT_EBAY: EbayConfig = {
  listingFormat: "fixed",
  auctionDuration: 7,
  bestOffer: true,
  autoAcceptPrice: 0,
  autoDeclinePrice: 0,
  promotedListing: false,
  promotedAdRate: 5,
  returnPolicy: "30day",
  shippingType: "free",
  flatShippingCost: 0,
  conditionId: "3000", // Good
};

export const DEFAULT_VINTED: VintedConfig = {
  shippingMethod: "vinted_shipping",
  bundleDiscount: 10,
  priceInclShipping: false,
};

export const DEFAULT_FACEBOOK: FacebookConfig = {
  pickupAvailable: true,
  pickupLocation: "",
  shippingAvailable: true,
  boostListing: false,
};

export const DEFAULT_VESTIAIRE: VestiaireConfig = {
  conditionGrade: "very_good",
  hasAuthenticity: false,
  hasOriginalPackaging: false,
  hasReceipt: false,
};

// ── Combined type ─────────────────────────────────────────────────────

export type PlatformConfig = {
  depop: DepopConfig;
  grailed: GrailedConfig;
  poshmark: PoshmarkConfig;
  mercari: MercariConfig;
  ebay: EbayConfig;
  vinted: VintedConfig;
  facebook: FacebookConfig;
  vestiaire: VestiaireConfig;
};

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  depop: DEFAULT_DEPOP,
  grailed: DEFAULT_GRAILED,
  poshmark: DEFAULT_POSHMARK,
  mercari: DEFAULT_MERCARI,
  ebay: DEFAULT_EBAY,
  vinted: DEFAULT_VINTED,
  facebook: DEFAULT_FACEBOOK,
  vestiaire: DEFAULT_VESTIAIRE,
};

// ── eBay condition map (id → label) ───────────────────────────────────

export const EBAY_CONDITIONS: Record<string, string> = {
  "1000": "New with tags",
  "1500": "New without tags",
  "2500": "New with defects",
  "3000": "Like New",
  "4000": "Very Good",
  "5000": "Good",
  "6000": "Acceptable",
};
