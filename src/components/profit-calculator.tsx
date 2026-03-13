"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  profitPositive,
  profitNegative,
  bestPlatformBadge,
  profitSummaryBorder,
  profitSummaryText,
} from "@/lib/colors";

interface PlatformBreakdown {
  name: string;
  feeLabel: string;
  totalFees: number;
  payout: number;
  netProfit: number;
}

function calculatePlatformFees(salePrice: number): PlatformBreakdown[] {
  const platforms: PlatformBreakdown[] = [];

  // Depop: 0% seller fee (buyers pay fees now)
  const depopFees = 0;
  platforms.push({
    name: "Depop",
    feeLabel: "0% seller fee",
    totalFees: depopFees,
    payout: salePrice - depopFees,
    netProfit: 0, // calculated later with shipping + COGS
  });

  // Grailed: 9% commission + ~3% payment processing
  const grailedCommission = salePrice * 0.09;
  const grailedPaymentProcessing = salePrice * 0.03;
  const grailedFees = grailedCommission + grailedPaymentProcessing;
  platforms.push({
    name: "Grailed",
    feeLabel: "9% + ~3% processing",
    totalFees: grailedFees,
    payout: salePrice - grailedFees,
    netProfit: 0,
  });

  // Poshmark: $2.95 for sales under $15, 20% for sales $15+
  const poshmarkFees = salePrice < 15 ? 2.95 : salePrice * 0.2;
  platforms.push({
    name: "Poshmark",
    feeLabel: salePrice < 15 ? "Flat $2.95" : "20% commission",
    totalFees: poshmarkFees,
    payout: salePrice - poshmarkFees,
    netProfit: 0,
  });

  // Mercari: 10% selling fee
  const mercariFees = salePrice * 0.1;
  platforms.push({
    name: "Mercari",
    feeLabel: "10% selling fee",
    totalFees: mercariFees,
    payout: salePrice - mercariFees,
    netProfit: 0,
  });

  return platforms;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface ProfitCalculatorProps {
  initialPrice?: number;
}

export function ProfitCalculator({
  initialPrice,
}: ProfitCalculatorProps = {}) {
  const [salePrice, setSalePrice] = useState<string>(
    initialPrice !== undefined ? String(initialPrice) : ""
  );
  const [shippingCost, setShippingCost] = useState<string>("");
  const [costOfGoods, setCostOfGoods] = useState<string>("");

  const salePriceNum = parseFloat(salePrice) || 0;
  const shippingCostNum = parseFloat(shippingCost) || 0;
  const costOfGoodsNum = parseFloat(costOfGoods) || 0;

  const platforms = useMemo(() => {
    if (salePriceNum <= 0) return [];

    const breakdown = calculatePlatformFees(salePriceNum);
    return breakdown.map((platform) => ({
      ...platform,
      netProfit: platform.payout - shippingCostNum - costOfGoodsNum,
    }));
  }, [salePriceNum, shippingCostNum, costOfGoodsNum]);

  const bestPlatform = useMemo(() => {
    if (platforms.length === 0) return null;
    return platforms.reduce((best, current) =>
      current.netProfit > best.netProfit ? current : best
    );
  }, [platforms]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Profit Calculator
        </CardTitle>
        <CardDescription>
          Compare your net profit across reselling platforms after fees,
          shipping, and cost of goods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="sale-price" className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Sale Price
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="sale-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="shipping-cost"
              className="flex items-center gap-1.5"
            >
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              Shipping Cost
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="shipping-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="cost-of-goods"
              className="flex items-center gap-1.5"
            >
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              Cost of Goods
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="cost-of-goods"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={costOfGoods}
                onChange={(e) => setCostOfGoods(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
        </div>

        {/* Results Table */}
        {platforms.length > 0 ? (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Fee Structure</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.map((platform) => {
                  const isProfit = platform.netProfit >= 0;
                  const isBest =
                    bestPlatform?.name === platform.name &&
                    platform.netProfit > 0;

                  return (
                    <TableRow key={platform.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {platform.name}
                          {isBest && (
                            <Badge
                              variant="default"
                              className={`${bestPlatformBadge} text-xs`}
                            >
                              Best
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {platform.feeLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(platform.totalFees)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(platform.payout)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-semibold",
                            isProfit ? profitPositive : profitNegative
                          )}
                        >
                          {isProfit ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {formatCurrency(platform.netProfit)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Summary */}
            {costOfGoodsNum > 0 && bestPlatform && bestPlatform.netProfit > 0 && (
              <div className={`rounded-lg border p-3 ${profitSummaryBorder}`}>
                <p className={`text-sm ${profitSummaryText}`}>
                  <span className="font-semibold">{bestPlatform.name}</span>{" "}
                  gives you the highest profit of{" "}
                  <span className="font-semibold">
                    {formatCurrency(bestPlatform.netProfit)}
                  </span>{" "}
                  — a{" "}
                  <span className="font-semibold">
                    {((bestPlatform.netProfit / costOfGoodsNum) * 100).toFixed(
                      0
                    )}
                    %
                  </span>{" "}
                  return on your cost of goods.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-muted-foreground">
            <DollarSign className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">
              Enter a sale price to see your profit breakdown.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
