"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/motion";
import {
  Truck,
  Package,
  DollarSign,
  TrendingDown,
  Shield,
  ArrowRightLeft,
  Check,
} from "lucide-react";
import { platformBranding } from "@/lib/colors";

/* ── Weight tier rate table ── */
interface RateRow {
  maxOz: number;
  usps: number;
  ups: number;
  fedex: number;
  uspsPriority?: boolean;
}

const rateTiers: RateRow[] = [
  { maxOz: 4, usps: 4.5, ups: 10, fedex: 9.5 },
  { maxOz: 8, usps: 5.25, ups: 11, fedex: 10.5 },
  { maxOz: 16, usps: 6.0, ups: 12, fedex: 11.5 },
  { maxOz: 32, usps: 8.5, ups: 13, fedex: 12.5, uspsPriority: true },
  { maxOz: 80, usps: 12, ups: 15, fedex: 14, uspsPriority: true },
  { maxOz: 160, usps: 16, ups: 19, fedex: 18, uspsPriority: true },
  { maxOz: Infinity, usps: 22, ups: 25, fedex: 24, uspsPriority: true },
];

function getTier(oz: number): RateRow {
  return rateTiers.find((t) => oz <= t.maxOz)!;
}

/* ── Platform fee helpers ── */
interface PlatformFee {
  key: string;
  label: string;
  description: string;
  calc: (price: number) => number;
}

const platformFees: PlatformFee[] = [
  {
    key: "depop",
    label: "Depop",
    description: "10% seller fee",
    calc: (p) => p * 0.1,
  },
  {
    key: "grailed",
    label: "Grailed",
    description: "9% + PayPal 3.49%",
    calc: (p) => p * 0.09 + p * 0.0349,
  },
  {
    key: "poshmark",
    label: "Poshmark",
    description: "20% (or $2.95 under $15)",
    calc: (p) => (p < 15 ? 2.95 : p * 0.2),
  },
  {
    key: "mercari",
    label: "Mercari",
    description: "10% seller fee",
    calc: (p) => p * 0.1,
  },
];

/* ── Carrier result type ── */
interface CarrierResult {
  name: string;
  cost: number;
  note: string;
  icon: string;
}

export default function ShippingPage() {
  const [weightVal, setWeightVal] = useState("");
  const [weightUnit, setWeightUnit] = useState<"oz" | "lbs">("oz");
  const [dimL, setDimL] = useState("");
  const [dimW, setDimW] = useState("");
  const [dimH, setDimH] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [destZip, setDestZip] = useState("");
  const [results, setResults] = useState<CarrierResult[] | null>(null);
  const [salePrice, setSalePrice] = useState("");

  const calculate = () => {
    const raw = parseFloat(weightVal);
    if (!raw || raw <= 0) return;
    const oz = weightUnit === "lbs" ? raw * 16 : raw;
    const tier = getTier(oz);

    const carriers: CarrierResult[] = [];

    if (oz <= 16) {
      carriers.push({
        name: "USPS First Class",
        cost: tier.usps,
        note: "2-5 business days",
        icon: "usps",
      });
    }

    carriers.push({
      name: tier.uspsPriority ? "USPS Priority Mail" : "USPS First Class",
      cost: tier.uspsPriority ? tier.usps : tier.usps,
      note: tier.uspsPriority ? "1-3 business days" : "2-5 business days",
      icon: "usps",
    });

    // avoid duplicate if First Class was already added and this would be same
    if (oz <= 16 && !tier.uspsPriority) {
      carriers.pop();
    }

    carriers.push({
      name: "UPS Ground",
      cost: tier.ups,
      note: "3-5 business days",
      icon: "ups",
    });

    carriers.push({
      name: "FedEx Ground",
      cost: tier.fedex,
      note: "3-5 business days",
      icon: "fedex",
    });

    carriers.push({
      name: "Pirate Ship (USPS)",
      cost: parseFloat((tier.usps * 0.85).toFixed(2)),
      note: "~15% discount on USPS",
      icon: "pirate",
    });

    // sort cheapest first
    carriers.sort((a, b) => a.cost - b.cost);
    setResults(carriers);
  };

  const cheapest = results ? results[0] : null;
  const price = parseFloat(salePrice) || 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <FadeInUp>
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2.5 rounded-xl">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Shipping Calculator</h1>
            <p className="text-muted-foreground text-sm">
              Compare carrier rates and estimate profit after fees
            </p>
          </div>
        </div>
      </FadeInUp>

      {/* ── Input Form ── */}
      <FadeInUp delay={0.05}>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Package Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Weight */}
            <div className="space-y-2">
              <Label>Weight</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 12"
                  value={weightVal}
                  onChange={(e) => setWeightVal(e.target.value)}
                  className="h-11 flex-1"
                  min={0}
                />
                <Button
                  variant={weightUnit === "oz" ? "default" : "outline"}
                  className="h-11 w-16"
                  onClick={() => setWeightUnit("oz")}
                >
                  oz
                </Button>
                <Button
                  variant={weightUnit === "lbs" ? "default" : "outline"}
                  className="h-11 w-16"
                  onClick={() => setWeightUnit("lbs")}
                >
                  lbs
                </Button>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              <Label>Dimensions (inches)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="L"
                  value={dimL}
                  onChange={(e) => setDimL(e.target.value)}
                  className="h-11"
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="W"
                  value={dimW}
                  onChange={(e) => setDimW(e.target.value)}
                  className="h-11"
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="H"
                  value={dimH}
                  onChange={(e) => setDimH(e.target.value)}
                  className="h-11"
                  min={0}
                />
              </div>
            </div>

            {/* Zip codes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Origin Zip Code</Label>
                <Input
                  placeholder="e.g. 10001"
                  value={originZip}
                  onChange={(e) => setOriginZip(e.target.value)}
                  className="h-11"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Destination Zip Code</Label>
                <Input
                  placeholder="e.g. 90210"
                  value={destZip}
                  onChange={(e) => setDestZip(e.target.value)}
                  className="h-11"
                  maxLength={5}
                />
              </div>
            </div>

            <Button onClick={calculate} className="w-full h-11">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Calculate Shipping Rates
            </Button>
          </CardContent>
        </Card>
      </FadeInUp>

      {/* ── Carrier Results ── */}
      {results && (
        <FadeInUp delay={0.1}>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Carrier Comparison
            </h2>
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((r) => {
                const isCheapest = r.name === cheapest?.name;
                return (
                  <StaggerItem key={r.name}>
                    <Card
                      className={`border-0 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${
                        isCheapest
                          ? "ring-2 ring-emerald-500/50"
                          : ""
                      }`}
                    >
                      {isCheapest && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                      )}
                      <CardContent className="pt-5 pb-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm">
                              {r.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {r.note}
                            </p>
                          </div>
                          {isCheapest && (
                            <Badge className="bg-emerald-600 text-white border-0 text-xs shrink-0">
                              <Check className="h-3 w-3 mr-1" />
                              Best Price
                            </Badge>
                          )}
                        </div>
                        <p className="text-2xl font-bold">
                          ${r.cost.toFixed(2)}
                        </p>
                        {isCheapest && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Cheapest option
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </FadeInUp>
      )}

      {/* ── Platform Fees ── */}
      <FadeInUp delay={0.15}>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Platform Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {platformFees.map((pf) => {
                const branding = platformBranding[pf.key];
                return (
                  <div
                    key={pf.key}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${branding?.bg ?? "bg-muted"} ${
                        branding?.color ?? "text-foreground"
                      } flex items-center justify-center font-bold text-sm`}
                    >
                      {branding?.icon ?? pf.label.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${branding?.color ?? ""}`}>
                        {pf.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pf.description}
                      </p>
                    </div>
                    {price > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        -${pf.calc(price).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </FadeInUp>

      {/* ── Profit Preview ── */}
      <FadeInUp delay={0.2}>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Profit Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Sale Price ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 45.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="h-11"
                min={0}
                step={0.01}
              />
            </div>

            {price > 0 && (
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {platformFees.map((pf) => {
                  const fee = pf.calc(price);
                  const shipping = cheapest?.cost ?? 0;
                  const net = price - fee - shipping;
                  const branding = platformBranding[pf.key];
                  return (
                    <StaggerItem key={pf.key}>
                      <Card
                        className={`border-0 shadow-sm overflow-hidden`}
                      >
                        <div className={`h-1 ${branding?.accent ?? "bg-muted"}`} />
                        <CardContent className="pt-4 pb-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-semibold ${
                                branding?.color ?? ""
                              }`}
                            >
                              {pf.label}
                            </span>
                            <span
                              className={`text-lg font-bold ${
                                net >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              ${net.toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Sale price</span>
                              <span>${price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Platform fee</span>
                              <span className="text-red-500">
                                -${fee.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>
                                Shipping{" "}
                                {cheapest
                                  ? `(${cheapest.name})`
                                  : "(estimate)"}
                              </span>
                              <span className="text-red-500">
                                -${shipping.toFixed(2)}
                              </span>
                            </div>
                            <div className="border-t pt-1 mt-1 flex justify-between font-medium text-foreground">
                              <span>Net profit</span>
                              <span>${net.toFixed(2)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}

            {price > 0 && !results && (
              <p className="text-xs text-muted-foreground text-center">
                Calculate shipping above to include shipping costs in the profit
                breakdown.
              </p>
            )}
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}
