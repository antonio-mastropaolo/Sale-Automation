/**
 * CrossList — Centralized color tokens
 *
 * All palette-derived Tailwind class strings live here so that every
 * component pulls from one source of truth.
 *
 * Palette reference (navy / blue / orange / yellow):
 *   Dark Navy  #0F1B3D   oklch(0.18 0.05 260)
 *   Navy Blue  #002B80   oklch(0.28 0.14 260)
 *   Royal Blue #2563EB   oklch(0.52 0.22 260)
 *   Medium Blue#5591F5   oklch(0.64 0.18 260)
 *   Light Blue #A5C9FF   oklch(0.82 0.09 260)
 *   Orange     #F5A623   oklch(0.78 0.16 75)
 *   Yellow     #F9D44B   oklch(0.87 0.14 90)
 *   Light Yel  #FDE68A   oklch(0.93 0.10 95)
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
};

// ── Listing status styles ──

export const statusStyles: Record<string, string> = {
  draft:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  active:
    "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
  sold:
    "bg-green-500/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700",
};

// ── Platform-listing publish status ──

export const publishStatusColor: Record<string, string> = {
  draft:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  published:
    "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
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
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
};

// ── Dashboard stats grid colors ──

export const statCardColors = {
  listings: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  active: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  published: {
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  revenue: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  views: {
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
  },
  likes: {
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10",
  },
  sales: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
};

// ── Health score helpers ──

export function scoreColor(score: number): string {
  if (score >= 85) return "text-blue-600 dark:text-blue-400";
  if (score >= 70) return "text-sky-600 dark:text-sky-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function scoreBg(score: number): string {
  if (score >= 85) return "bg-blue-500";
  if (score >= 70) return "bg-sky-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export const impactStyles: Record<string, string> = {
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
};

// ── Confidence score helpers (smart lister) ──

export function confidenceColor(score: number): string {
  if (score >= 80) return "text-blue-600 dark:text-blue-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function confidenceBg(score: number): string {
  if (score >= 80) return "bg-blue-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

// ── Negotiation response types ──

export const responseStyles: Record<string, string> = {
  firm: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  negotiate:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  accept:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
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
    "bg-gradient-to-br from-blue-500 to-indigo-600",
    "bg-gradient-to-br from-orange-500 to-amber-600",
    "bg-gradient-to-br from-sky-500 to-blue-600",
    "bg-gradient-to-br from-amber-500 to-yellow-500",
    "bg-gradient-to-br from-indigo-500 to-blue-700",
  ];
  return gradients[index % gradients.length];
}

// ── Chart bar fill colors (oklch, for Recharts) ──

export const chartFills = {
  listings: "oklch(0.546 0.245 262.881)", // blue
  published: "oklch(0.646 0.222 41.116)", // orange
  views: "oklch(0.6 0.118 184.704)", // teal
  likes: "oklch(0.828 0.189 84.429)", // yellow
};

// ── Profit calculator ──

export const profitPositive = "text-blue-600 dark:text-blue-400";
export const profitNegative = "text-red-600 dark:text-red-400";
export const bestPlatformBadge = "bg-blue-600 text-white";
export const profitSummaryBorder =
  "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30";
export const profitSummaryText =
  "text-blue-800 dark:text-blue-300";
