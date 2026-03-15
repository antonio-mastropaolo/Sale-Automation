/**
 * ListBlitz Theme System
 *
 * Each theme defines a primary color for light and dark mode,
 * plus accent background/foreground that complement the primary.
 * The theme is applied by setting CSS custom properties on :root.
 */

export interface ThemeColors {
  label: string;
  light: string;       // primary in light mode
  dark: string;        // primary in dark mode
  lightHover: string;  // slightly darker for hover
  darkHover: string;
  accent: string;      // light accent bg
  accentFg: string;    // accent text
  accentDark: string;  // dark-mode accent bg
  accentFgDark: string;
  ring: string;        // = light
  ringDark: string;    // = dark
}

export const THEMES: Record<string, ThemeColors> = {
  teal: {
    label: "Teal",
    light: "#0d9488", dark: "#2dd4bf",
    lightHover: "#0f766e", darkHover: "#14b8a6",
    accent: "#f0fdfa", accentFg: "#115e59",
    accentDark: "#042f2e", accentFgDark: "#5eead4",
    ring: "#0d9488", ringDark: "#2dd4bf",
  },
  blue: {
    label: "Blue",
    light: "#2563eb", dark: "#60a5fa",
    lightHover: "#1d4ed8", darkHover: "#3b82f6",
    accent: "#eff6ff", accentFg: "#1e40af",
    accentDark: "#172554", accentFgDark: "#93c5fd",
    ring: "#2563eb", ringDark: "#60a5fa",
  },
  violet: {
    label: "Violet",
    light: "#7c3aed", dark: "#a78bfa",
    lightHover: "#6d28d9", darkHover: "#8b5cf6",
    accent: "#ede9fe", accentFg: "#5b21b6",
    accentDark: "#1e1547", accentFgDark: "#c4b5fd",
    ring: "#7c3aed", ringDark: "#a78bfa",
  },
  rose: {
    label: "Rose",
    light: "#e11d48", dark: "#fb7185",
    lightHover: "#be123c", darkHover: "#f43f5e",
    accent: "#fff1f2", accentFg: "#9f1239",
    accentDark: "#4c0519", accentFgDark: "#fda4af",
    ring: "#e11d48", ringDark: "#fb7185",
  },
  amber: {
    label: "Amber",
    light: "#d97706", dark: "#fbbf24",
    lightHover: "#b45309", darkHover: "#f59e0b",
    accent: "#fffbeb", accentFg: "#92400e",
    accentDark: "#451a03", accentFgDark: "#fcd34d",
    ring: "#d97706", ringDark: "#fbbf24",
  },
  indigo: {
    label: "Indigo",
    light: "#4f46e5", dark: "#818cf8",
    lightHover: "#4338ca", darkHover: "#6366f1",
    accent: "#eef2ff", accentFg: "#3730a3",
    accentDark: "#1e1b4b", accentFgDark: "#a5b4fc",
    ring: "#4f46e5", ringDark: "#818cf8",
  },
  emerald: {
    label: "Emerald",
    light: "#059669", dark: "#34d399",
    lightHover: "#047857", darkHover: "#10b981",
    accent: "#ecfdf5", accentFg: "#065f46",
    accentDark: "#022c22", accentFgDark: "#6ee7b7",
    ring: "#059669", ringDark: "#34d399",
  },
  orange: {
    label: "Orange",
    light: "#ea580c", dark: "#fb923c",
    lightHover: "#c2410c", darkHover: "#f97316",
    accent: "#fff7ed", accentFg: "#9a3412",
    accentDark: "#431407", accentFgDark: "#fdba74",
    ring: "#ea580c", ringDark: "#fb923c",
  },
  cyan: {
    label: "Cyan",
    light: "#0891b2", dark: "#22d3ee",
    lightHover: "#0e7490", darkHover: "#06b6d4",
    accent: "#ecfeff", accentFg: "#155e75",
    accentDark: "#083344", accentFgDark: "#67e8f9",
    ring: "#0891b2", ringDark: "#22d3ee",
  },
  slate: {
    label: "Slate",
    light: "#475569", dark: "#94a3b8",
    lightHover: "#334155", darkHover: "#64748b",
    accent: "#f1f5f9", accentFg: "#1e293b",
    accentDark: "#0f172a", accentFgDark: "#cbd5e1",
    ring: "#475569", ringDark: "#94a3b8",
  },
};

export const DEFAULT_THEME = "teal";

export function applyTheme(themeId: string, isDark: boolean) {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;

  if (isDark) {
    root.style.setProperty("--primary", theme.dark);
    root.style.setProperty("--primary-foreground", "#0c1222");
    root.style.setProperty("--accent", theme.accentDark);
    root.style.setProperty("--accent-foreground", theme.accentFgDark);
    root.style.setProperty("--ring", theme.ringDark);
    root.style.setProperty("--sidebar-primary", theme.dark);
    root.style.setProperty("--sidebar-primary-foreground", "#0c1222");
  } else {
    root.style.setProperty("--primary", theme.light);
    root.style.setProperty("--primary-foreground", "#ffffff");
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-foreground", theme.accentFg);
    root.style.setProperty("--ring", theme.ring);
    root.style.setProperty("--sidebar-primary", theme.light);
    root.style.setProperty("--sidebar-primary-foreground", "#ffffff");
  }
}

export function getSavedTheme(): string {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return localStorage.getItem("listblitz-theme") || DEFAULT_THEME;
}

export function saveTheme(themeId: string) {
  localStorage.setItem("listblitz-theme", themeId);
}
