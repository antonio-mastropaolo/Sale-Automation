"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Info,
  Zap,
  Tag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { platformBranding } from "@/lib/colors";
import {
  type DepopConfig,
  type GrailedConfig,
  type PoshmarkConfig,
  type MercariConfig,
  type EbayConfig,
  type PlatformConfig,
  DEFAULT_PLATFORM_CONFIG,
  EBAY_CONDITIONS,
} from "@/lib/platform-config";

// ── Shared sub-components ────────────────────────────────────────────

function SettingRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2", className)}>
      {children}
    </div>
  );
}

function SettingLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <Label className="text-sm font-medium">{children}</Label>
      {hint && (
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      )}
    </div>
  );
}

function InfoBanner({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warning";
}) {
  const isWarning = variant === "warning";
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
        isWarning
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
      )}
    >
      {isWarning ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

function PercentInput({
  value,
  onChange,
  min = 0,
  max = 100,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="relative w-20">
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="pr-6 text-right h-8 text-sm"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        %
      </span>
    </div>
  );
}

function DollarInput({
  value,
  onChange,
  min = 0,
  disabled,
  placeholder = "0.00",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative w-24">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        $
      </span>
      <Input
        type="number"
        min={min}
        step="0.01"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        placeholder={placeholder}
        className="pl-5 h-8 text-sm"
      />
    </div>
  );
}

function PlatformHeader({ platform }: { platform: string }) {
  const brand = platformBranding[platform];
  if (!brand) return null;
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white",
          brand.accent
        )}
      >
        {brand.icon}
      </div>
      <span className={cn("text-sm font-semibold", brand.color)}>
        {brand.label} Settings
      </span>
    </div>
  );
}

// ── Per-platform settings forms ──────────────────────────────────────

function DepopSettings({
  config,
  onChange,
}: {
  config: DepopConfig;
  onChange: (c: DepopConfig) => void;
}) {
  const update = <K extends keyof DepopConfig>(key: K, val: DepopConfig[K]) =>
    onChange({ ...config, [key]: val });

  return (
    <div className="space-y-1">
      <PlatformHeader platform="depop" />

      <SettingRow>
        <SettingLabel hint="Pay a percentage to boost visibility in search results">
          <Zap className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
          Boost this listing
        </SettingLabel>
        <div className="flex items-center gap-2">
          <PercentInput
            value={config.boostPercent}
            onChange={(v) => update("boostPercent", v)}
            min={0}
            max={100}
            disabled={!config.boostEnabled}
          />
          <Switch
            checked={config.boostEnabled}
            onCheckedChange={(v) => update("boostEnabled", v as boolean)}
          />
        </div>
      </SettingRow>

      <SettingRow>
        <SettingLabel hint="Discount for buyers purchasing 2+ items from your shop">
          Bundle discount
        </SettingLabel>
        <PercentInput
          value={config.bundleDiscount}
          onChange={(v) => update("bundleDiscount", v)}
          min={0}
          max={95}
        />
      </SettingRow>

      <SettingRow>
        <SettingLabel hint="How shipping is calculated for bundles">
          Bundle shipping
        </SettingLabel>
        <Select
          value={config.bundleShipping}
          onValueChange={(v) =>
            update("bundleShipping", v as DepopConfig["bundleShipping"])
          }
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free shipping</SelectItem>
            <SelectItem value="highest">Highest single</SelectItem>
            <SelectItem value="combined">Combined</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow>
        <SettingLabel hint="Allow buyers to send you offers">
          Accept offers
        </SettingLabel>
        <div className="flex items-center gap-2">
          {config.offersEnabled && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Min</span>
              <PercentInput
                value={config.minOfferPercent}
                onChange={(v) => update("minOfferPercent", v)}
                min={1}
                max={100}
              />
            </div>
          )}
          <Switch
            checked={config.offersEnabled}
            onCheckedChange={(v) => update("offersEnabled", v as boolean)}
          />
        </div>
      </SettingRow>
    </div>
  );
}

function GrailedSettings({
  config,
  onChange,
}: {
  config: GrailedConfig;
  onChange: (c: GrailedConfig) => void;
}) {
  const update = <K extends keyof GrailedConfig>(key: K, val: GrailedConfig[K]) =>
    onChange({ ...config, [key]: val });

  return (
    <div className="space-y-1">
      <PlatformHeader platform="grailed" />

      <InfoBanner variant="warning">
        Grailed only allows price decreases on existing listings. To raise the
        price, you must delete and relist.
      </InfoBanner>

      <SettingRow>
        <SettingLabel hint="Automatically bump your listing after N days (7 = free bump)">
          Bump after days
        </SettingLabel>
        <div className="w-20">
          <Input
            type="number"
            min={1}
            max={30}
            value={config.bumpAfterDays}
            onChange={(e) => update("bumpAfterDays", Number(e.target.value))}
            className="h-8 text-sm text-right"
          />
        </div>
      </SettingRow>

      <SettingRow>
        <SettingLabel hint="Allow buyers to send you offers">
          Accept offers
        </SettingLabel>
        <div className="flex items-center gap-2">
          {config.offersEnabled && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Min</span>
              <PercentInput
                value={config.minOfferPercent}
                onChange={(v) => update("minOfferPercent", v)}
                min={1}
                max={100}
              />
            </div>
          )}
          <Switch
            checked={config.offersEnabled}
            onCheckedChange={(v) => update("offersEnabled", v as boolean)}
          />
        </div>
      </SettingRow>

      <InfoBanner>
        No paid promotion is available on Grailed. Listings are surfaced
        organically by the algorithm.
      </InfoBanner>
    </div>
  );
}

function PoshmarkSettings({
  config,
  onChange,
}: {
  config: PoshmarkConfig;
  onChange: (c: PoshmarkConfig) => void;
}) {
  const update = <K extends keyof PoshmarkConfig>(key: K, val: PoshmarkConfig[K]) =>
    onChange({ ...config, [key]: val });

  const [tagInput, setTagInput] = useState("");

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !config.partyTags.includes(trimmed)) {
      update("partyTags", [...config.partyTags, trimmed]);
    }
    setTagInput("");
  }, [tagInput, config.partyTags, update]);

  const removeTag = (tag: string) => {
    update(
      "partyTags",
      config.partyTags.filter((t) => t !== tag)
    );
  };

  return (
    <div className="space-y-1">
      <PlatformHeader platform="poshmark" />

      <SettingRow>
        <SettingLabel hint="Send Offer to Likers — discount must be 10% or more">
          Offer to Likers
        </SettingLabel>
        <div className="flex items-center gap-2">
          {config.offerToLikers && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Discount</span>
              <PercentInput
                value={config.offerDiscountPercent}
                onChange={(v) =>
                  update("offerDiscountPercent", Math.max(10, v))
                }
                min={10}
                max={80}
              />
            </div>
          )}
          <Switch
            checked={config.offerToLikers}
            onCheckedChange={(v) => update("offerToLikers", v as boolean)}
          />
        </div>
      </SettingRow>

      <SettingRow>
        <SettingLabel hint="Seller-funded shipping discount">
          Shipping discount
        </SettingLabel>
        <DollarInput
          value={config.shippingDiscount}
          onChange={(v) => update("shippingDiscount", v)}
        />
      </SettingRow>

      <SettingRow>
        <SettingLabel hint="Automatically share listings from your closet">
          Enable closet sharing
        </SettingLabel>
        <Switch
          checked={config.closetSharingEnabled}
          onCheckedChange={(v) => update("closetSharingEnabled", v as boolean)}
        />
      </SettingRow>

      <SettingRow>
        <SettingLabel hint="Discount for buyers purchasing 2+ items">
          Bundle discount
        </SettingLabel>
        <PercentInput
          value={config.bundleDiscount}
          onChange={(v) => update("bundleDiscount", v)}
          min={0}
          max={80}
        />
      </SettingRow>

      {/* Posh Party Tags */}
      <div className="pt-2 space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" />
          Posh Party Tags
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {config.partyTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 text-xs pl-2 pr-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a party tag..."
            className="h-8 text-sm flex-1"
          />
          <button
            type="button"
            onClick={addTag}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function MercariSettings({
  config,
  onChange,
}: {
  config: MercariConfig;
  onChange: (c: MercariConfig) => void;
}) {
  const update = <K extends keyof MercariConfig>(key: K, val: MercariConfig[K]) =>
    onChange({ ...config, [key]: val });

  return (
    <div className="space-y-1">
      <PlatformHeader platform="mercari" />

      <SettingRow>
        <SettingLabel hint="Automatically decrement the price until it reaches the floor">
          Smart Pricing
        </SettingLabel>
        <div className="flex items-center gap-2">
          {config.smartPricing && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Floor</span>
              <DollarInput
                value={config.smartPriceFloor}
                onChange={(v) => update("smartPriceFloor", v)}
              />
            </div>
          )}
          <Switch
            checked={config.smartPricing}
            onCheckedChange={(v) => update("smartPricing", v as boolean)}
          />
        </div>
      </SettingRow>

      {config.smartPricing && (
        <InfoBanner>
          Smart Pricing auto-decrements your price daily until it reaches
          the floor you set.
        </InfoBanner>
      )}

      <SettingRow>
        <SettingLabel hint="Promote your listing — requires at least a 5% price drop">
          Promote listing
        </SettingLabel>
        <Switch
          checked={config.promoteEnabled}
          onCheckedChange={(v) => update("promoteEnabled", v as boolean)}
        />
      </SettingRow>

      <SettingRow>
        <SettingLabel hint="Send price offers to users who liked your item">
          Send offers to likers
        </SettingLabel>
        <Switch
          checked={config.offersToLikers}
          onCheckedChange={(v) => update("offersToLikers", v as boolean)}
        />
      </SettingRow>

      <SettingRow>
        <SettingLabel>Shipping paid by</SettingLabel>
        <Select
          value={config.shippingPaidBy}
          onValueChange={(v) =>
            update("shippingPaidBy", v as MercariConfig["shippingPaidBy"])
          }
        >
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="seller">Seller</SelectItem>
            <SelectItem value="buyer">Buyer</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow>
        <SettingLabel>Shipping carrier</SettingLabel>
        <Select
          value={config.shippingCarrier}
          onValueChange={(v) =>
            update("shippingCarrier", v as MercariConfig["shippingCarrier"])
          }
        >
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usps">USPS</SelectItem>
            <SelectItem value="fedex">FedEx</SelectItem>
            <SelectItem value="ups">UPS</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  );
}

function EbaySettings({
  config,
  onChange,
}: {
  config: EbayConfig;
  onChange: (c: EbayConfig) => void;
}) {
  const update = <K extends keyof EbayConfig>(key: K, val: EbayConfig[K]) =>
    onChange({ ...config, [key]: val });

  const isAuction =
    config.listingFormat === "auction" || config.listingFormat === "auction_bin";

  return (
    <div className="space-y-1">
      <PlatformHeader platform="ebay" />

      <SettingRow>
        <SettingLabel>Listing format</SettingLabel>
        <Select
          value={config.listingFormat}
          onValueChange={(v) =>
            update("listingFormat", v as EbayConfig["listingFormat"])
          }
        >
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed Price</SelectItem>
            <SelectItem value="auction">Auction</SelectItem>
            <SelectItem value="auction_bin">Auction + Buy It Now</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      {isAuction && (
        <SettingRow>
          <SettingLabel hint="How long the auction runs">
            Auction duration
          </SettingLabel>
          <Select
            value={String(config.auctionDuration)}
            onValueChange={(v) =>
              update(
                "auctionDuration",
                Number(v) as EbayConfig["auctionDuration"]
              )
            }
          >
            <SelectTrigger className="w-28 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {([1, 3, 5, 7, 10, 30] as const).map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} {d === 1 ? "day" : "days"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      )}

      <SettingRow>
        <SettingLabel hint="Let buyers make offers on your listing">
          Best Offer
        </SettingLabel>
        <Switch
          checked={config.bestOffer}
          onCheckedChange={(v) => update("bestOffer", v as boolean)}
        />
      </SettingRow>

      {config.bestOffer && (
        <div className="ml-4 space-y-1 border-l-2 border-muted pl-3">
          <SettingRow>
            <SettingLabel hint="Automatically accept offers above this price">
              Auto-accept price
            </SettingLabel>
            <DollarInput
              value={config.autoAcceptPrice}
              onChange={(v) => update("autoAcceptPrice", v)}
            />
          </SettingRow>
          <SettingRow>
            <SettingLabel hint="Automatically decline offers below this price">
              Auto-decline price
            </SettingLabel>
            <DollarInput
              value={config.autoDeclinePrice}
              onChange={(v) => update("autoDeclinePrice", v)}
            />
          </SettingRow>
        </div>
      )}

      <SettingRow>
        <SettingLabel hint="Pay to promote your listing in search results">
          Promoted Listing
        </SettingLabel>
        <div className="flex items-center gap-2">
          {config.promotedListing && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Ad rate</span>
              <PercentInput
                value={config.promotedAdRate}
                onChange={(v) => update("promotedAdRate", Math.min(20, Math.max(1, v)))}
                min={1}
                max={20}
              />
            </div>
          )}
          <Switch
            checked={config.promotedListing}
            onCheckedChange={(v) => update("promotedListing", v as boolean)}
          />
        </div>
      </SettingRow>

      <SettingRow>
        <SettingLabel>Return policy</SettingLabel>
        <Select
          value={config.returnPolicy}
          onValueChange={(v) =>
            update("returnPolicy", v as EbayConfig["returnPolicy"])
          }
        >
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="30day">30-day returns</SelectItem>
            <SelectItem value="60day">60-day returns</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow>
        <SettingLabel>Shipping</SettingLabel>
        <div className="flex items-center gap-2">
          {config.shippingType === "flat" && (
            <DollarInput
              value={config.flatShippingCost}
              onChange={(v) => update("flatShippingCost", v)}
            />
          )}
          <Select
            value={config.shippingType}
            onValueChange={(v) =>
              update("shippingType", v as EbayConfig["shippingType"])
            }
          >
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calculated">Calculated</SelectItem>
              <SelectItem value="flat">Flat rate</SelectItem>
              <SelectItem value="free">Free shipping</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingRow>

      <SettingRow>
        <SettingLabel>Condition</SettingLabel>
        <Select
          value={config.conditionId}
          onValueChange={(v) => v && update("conditionId", v)}
        >
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EBAY_CONDITIONS).map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  );
}

// ── Main exported component ──────────────────────────────────────────

const PLATFORM_KEYS = ["depop", "grailed", "poshmark", "mercari", "ebay"] as const;

export interface PlatformPublishSettingsProps {
  config: PlatformConfig;
  onChange: (config: PlatformConfig) => void;
  /** Optionally restrict which platform tabs are shown */
  platforms?: string[];
}

export function PlatformPublishSettings({
  config,
  onChange,
  platforms,
}: PlatformPublishSettingsProps) {
  const visiblePlatforms = platforms
    ? PLATFORM_KEYS.filter((k) => platforms.includes(k))
    : PLATFORM_KEYS;

  const defaultTab = visiblePlatforms[0] || "depop";

  const handleChange = useCallback(
    <K extends keyof PlatformConfig>(platform: K, value: PlatformConfig[K]) => {
      onChange({ ...config, [platform]: value });
    },
    [config, onChange]
  );

  if (visiblePlatforms.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platform Publishing Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4 w-full flex-wrap">
            {visiblePlatforms.map((key) => {
              const brand = platformBranding[key];
              return (
                <TabsTrigger key={key} value={key} className="gap-1.5">
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white",
                      brand?.accent
                    )}
                  >
                    {brand?.icon}
                  </span>
                  <span className="hidden sm:inline">{brand?.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {visiblePlatforms.includes("depop") && (
            <TabsContent value="depop">
              <DepopSettings
                config={config.depop}
                onChange={(c) => handleChange("depop", c)}
              />
            </TabsContent>
          )}

          {visiblePlatforms.includes("grailed") && (
            <TabsContent value="grailed">
              <GrailedSettings
                config={config.grailed}
                onChange={(c) => handleChange("grailed", c)}
              />
            </TabsContent>
          )}

          {visiblePlatforms.includes("poshmark") && (
            <TabsContent value="poshmark">
              <PoshmarkSettings
                config={config.poshmark}
                onChange={(c) => handleChange("poshmark", c)}
              />
            </TabsContent>
          )}

          {visiblePlatforms.includes("mercari") && (
            <TabsContent value="mercari">
              <MercariSettings
                config={config.mercari}
                onChange={(c) => handleChange("mercari", c)}
              />
            </TabsContent>
          )}

          {visiblePlatforms.includes("ebay") && (
            <TabsContent value="ebay">
              <EbaySettings
                config={config.ebay}
                onChange={(c) => handleChange("ebay", c)}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_PLATFORM_CONFIG };
