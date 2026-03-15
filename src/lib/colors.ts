/**
 * ListBlitz — Centralized color tokens
 *
 * All palette-derived Tailwind class strings live here so that every
 * component pulls from one source of truth.
 *
 * Palette reference (forest green / gold / cream):
 *   Dark Green  #1A3A2A   oklch(0.22 0.06 155)
 *   Forest Grn  #2D6A4F   oklch(0.45 0.15 155)
 *   Medium Grn  #40916C   oklch(0.55 0.12 155)
 *   Light Green #52B788   oklch(0.65 0.10 155)
 *   Pale Green  #95D5B2   oklch(0.80 0.08 155)
 *   Gold/Amber  #D4A843   oklch(0.80 0.12 85)
 *   Warm Cream  #F5F0E8   oklch(0.97 0.01 90)
 *   Terracotta  #C4593A   oklch(0.60 0.14 30)
 */

// ── Platform badges (simple bg + text, used in listings, tools, hashtags) ──

export const platformBadge: Record<string, string> = {
  depop:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  grailed:
    "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  poshmark:
    "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800",
  mercari:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  ebay:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  vinted:
    "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",
  facebook:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  vestiaire:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

// ── Platform branding (extended — includes icon letter, border, accent bar) ──

export const platformBranding: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    accent: string;
    icon: string;
  }
> = {
  depop: {
    label: "Depop",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-800",
    accent: "bg-orange-500",
    icon: "D",
  },
  grailed: {
    label: "Grailed",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-200 dark:border-slate-700",
    accent: "bg-slate-600",
    icon: "G",
  },
  poshmark: {
    label: "Poshmark",
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-200 dark:border-pink-800",
    accent: "bg-pink-500",
    icon: "P",
  },
  mercari: {
    label: "Mercari",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-800",
    accent: "bg-blue-500",
    icon: "M",
  },
  ebay: {
    label: "eBay",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-200 dark:border-yellow-800",
    accent: "bg-yellow-500",
    icon: "e",
  },
  vinted: {
    label: "Vinted",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-200 dark:border-teal-800",
    accent: "bg-teal-500",
    icon: "V",
  },
  facebook: {
    label: "Facebook Marketplace",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-800",
    accent: "bg-blue-500",
    icon: "F",
  },
  vestiaire: {
    label: "Vestiaire Collective",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-800",
    accent: "bg-amber-500",
    icon: "VC",
  },
};

// ── Listing status styles ──

export const statusStyles: Record<string, string> = {
  draft:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  active:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
  sold:
    "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700",
};

// ── Platform-listing publish status ──

export const publishStatusColor: Record<string, string> = {
  draft:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  published:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
  failed:
    "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
};

// ── Priority levels (recommendations) ──

export const priorityStyles: Record<
  string,
  { color: string; bg: string }
> = {
  high: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  medium: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  low: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
};

// ── Dashboard stats grid colors ──

export const statCardColors = {
  listings: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  active: {
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10",
  },
  published: {
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  revenue: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  views: {
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10",
  },
  likes: {
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10",
  },
  sales: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
};

// ── Health score helpers ──

export function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-teal-600 dark:text-teal-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function scoreBg(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-teal-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export const impactStyles: Record<string, string> = {
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

// ── Confidence score helpers (smart lister) ──

export function confidenceColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function confidenceBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

// ── Negotiation response types ──

export const responseStyles: Record<string, string> = {
  firm: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  negotiate:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  accept:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

// ── Trend heat helpers ──

export function heatColor(heat: number) {
  if (heat >= 80)
    return {
      bar: "bg-gradient-to-r from-orange-500 to-amber-400",
      text: "text-orange-600 dark:text-orange-400",
      label: "Hot",
    };
  if (heat >= 60)
    return {
      bar: "bg-gradient-to-r from-amber-400 to-yellow-400",
      text: "text-amber-600 dark:text-amber-400",
      label: "Warm",
    };
  return {
    bar: "bg-gradient-to-r from-yellow-400 to-yellow-300",
    text: "text-yellow-600 dark:text-yellow-400",
    label: "Rising",
  };
}

export function brandGradient(index: number): string {
  const gradients = [
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-orange-500 to-amber-600",
    "bg-gradient-to-br from-teal-500 to-emerald-600",
    "bg-gradient-to-br from-amber-500 to-yellow-500",
    "bg-gradient-to-br from-emerald-600 to-green-700",
  ];
  return gradients[index % gradients.length];
}

// ── Chart bar fill colors (oklch, for Recharts) ──

export const chartFills = {
  listings: "oklch(0.45 0.15 155)", // deep green
  published: "oklch(0.55 0.12 155)", // medium green
  views: "oklch(0.65 0.10 155)", // light green
  likes: "oklch(0.80 0.12 85)", // gold
};

// ── Profit calculator ──

export const profitPositive = "text-emerald-600 dark:text-emerald-400";
export const profitNegative = "text-red-600 dark:text-red-400";
export const bestPlatformBadge = "bg-emerald-600 text-white";
export const profitSummaryBorder =
  "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30";
export const profitSummaryText =
  "text-emerald-800 dark:text-emerald-300";
