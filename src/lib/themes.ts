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

// ── Design Styles (full palette overrides, mainly dark mode) ──

export interface DesignLayout {
  radius: string;          // border-radius for cards
  borderWidth: string;     // border thickness
  shadow: string;          // box-shadow for cards
  shadowHover: string;     // box-shadow on hover
  cardPadding: string;     // inner padding
  backdropBlur: string;    // backdrop-filter blur
  fontWeight: string;      // heading font weight (600, 700, 800)
  spacing: string;         // gap between sections
  iconStroke: string;      // icon stroke width
  buttonRadius: string;    // button border-radius
}

export interface DesignStyle {
  id: string;
  label: string;
  description: string;
  preview: string;
  layout: DesignLayout;
  dark: {
    background: string;
    card: string;
    cardForeground: string;
    popover: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    input: string;
    sidebar: string;
    sidebarForeground: string;
    sidebarBorder: string;
  };
  light: {
    background: string;
    card: string;
    secondary: string;
    muted: string;
    mutedForeground: string;
    border: string;
    sidebar: string;
    sidebarBorder: string;
  };
}

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "flat",
    label: "Flat",
    description: "Clean, minimal, bold colors",
    preview: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    layout: { radius: "0.5rem", borderWidth: "1px", shadow: "none", shadowHover: "none", cardPadding: "1rem", backdropBlur: "none", fontWeight: "700", spacing: "1.25rem", iconStroke: "2", buttonRadius: "0.5rem" },
    dark: {
      background: "#0f0f0f", card: "#1a1a1a", cardForeground: "#fafafa",
      popover: "#1a1a1a", secondary: "#262626", secondaryForeground: "#e5e5e5",
      muted: "#262626", mutedForeground: "#a3a3a3", border: "rgba(255,255,255,0.08)",
      input: "#262626", sidebar: "rgba(15,15,15,0.95)", sidebarForeground: "#a3a3a3",
      sidebarBorder: "rgba(255,255,255,0.06)",
    },
    light: {
      background: "#fafafa", card: "#ffffff", secondary: "#f0f0f0",
      muted: "#f0f0f0", mutedForeground: "#737373", border: "rgba(0,0,0,0.06)",
      sidebar: "rgba(250,250,250,0.9)", sidebarBorder: "rgba(0,0,0,0.04)",
    },
  },
  {
    id: "material",
    label: "Material",
    description: "Google's layered paper design",
    preview: "linear-gradient(135deg, #121212 0%, #1e1e1e 50%, #2d2d2d 100%)",
    layout: { radius: "0.75rem", borderWidth: "0px", shadow: "0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)", shadowHover: "0 8px 24px rgba(0,0,0,0.3)", cardPadding: "1.25rem", backdropBlur: "none", fontWeight: "600", spacing: "1.5rem", iconStroke: "2", buttonRadius: "1.25rem" },
    dark: {
      background: "#121212", card: "#1e1e1e", cardForeground: "#e0e0e0",
      popover: "#2d2d2d", secondary: "#2d2d2d", secondaryForeground: "#e0e0e0",
      muted: "#2d2d2d", mutedForeground: "#9e9e9e", border: "rgba(255,255,255,0.12)",
      input: "#2d2d2d", sidebar: "rgba(18,18,18,0.98)", sidebarForeground: "#9e9e9e",
      sidebarBorder: "rgba(255,255,255,0.08)",
    },
    light: {
      background: "#fafafa", card: "#ffffff", secondary: "#f5f5f5",
      muted: "#eeeeee", mutedForeground: "#757575", border: "rgba(0,0,0,0.08)",
      sidebar: "rgba(255,255,255,0.95)", sidebarBorder: "rgba(0,0,0,0.06)",
    },
  },
  {
    id: "glass",
    label: "Glassmorphism",
    description: "Frosted glass with blur effects",
    preview: "linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.6) 100%)",
    layout: { radius: "1rem", borderWidth: "1px", shadow: "0 4px 30px rgba(0,0,0,0.1)", shadowHover: "0 8px 40px rgba(0,0,0,0.15)", cardPadding: "1.5rem", backdropBlur: "blur(20px)", fontWeight: "600", spacing: "1.5rem", iconStroke: "1.5", buttonRadius: "0.75rem" },
    dark: {
      background: "#0a0a0f", card: "rgba(30,30,45,0.6)", cardForeground: "#e2e8f0",
      popover: "rgba(30,30,45,0.8)", secondary: "rgba(50,50,70,0.4)", secondaryForeground: "#cbd5e1",
      muted: "rgba(50,50,70,0.3)", mutedForeground: "#94a3b8", border: "rgba(148,163,184,0.1)",
      input: "rgba(50,50,70,0.4)", sidebar: "rgba(10,10,15,0.7)", sidebarForeground: "#94a3b8",
      sidebarBorder: "rgba(148,163,184,0.08)",
    },
    light: {
      background: "#f0f4f8", card: "rgba(255,255,255,0.7)", secondary: "rgba(241,245,249,0.6)",
      muted: "rgba(226,232,240,0.5)", mutedForeground: "#64748b", border: "rgba(0,0,0,0.06)",
      sidebar: "rgba(255,255,255,0.6)", sidebarBorder: "rgba(0,0,0,0.04)",
    },
  },
  {
    id: "neumorphic",
    label: "Neumorphism",
    description: "Soft extruded surfaces",
    preview: "linear-gradient(145deg, #1a1a2e 0%, #25253d 100%)",
    layout: { radius: "1.25rem", borderWidth: "0px", shadow: "6px 6px 12px rgba(0,0,0,0.3), -6px -6px 12px rgba(255,255,255,0.03)", shadowHover: "8px 8px 16px rgba(0,0,0,0.4), -8px -8px 16px rgba(255,255,255,0.04)", cardPadding: "1.5rem", backdropBlur: "none", fontWeight: "600", spacing: "1.75rem", iconStroke: "1.5", buttonRadius: "1rem" },
    dark: {
      background: "#1a1a2e", card: "#1f1f35", cardForeground: "#e0def4",
      popover: "#25253d", secondary: "#25253d", secondaryForeground: "#e0def4",
      muted: "#25253d", mutedForeground: "#908caa", border: "rgba(255,255,255,0.04)",
      input: "#25253d", sidebar: "rgba(26,26,46,0.95)", sidebarForeground: "#908caa",
      sidebarBorder: "rgba(255,255,255,0.03)",
    },
    light: {
      background: "#e8e8ef", card: "#e8e8ef", secondary: "#dfdfe6",
      muted: "#dfdfe6", mutedForeground: "#6e6a86", border: "rgba(0,0,0,0.04)",
      sidebar: "rgba(232,232,239,0.9)", sidebarBorder: "rgba(0,0,0,0.03)",
    },
  },
  {
    id: "ios",
    label: "Apple HIG",
    description: "iOS-style clarity and depth",
    preview: "linear-gradient(135deg, #000000 0%, #1c1c1e 100%)",
    layout: { radius: "0.75rem", borderWidth: "0.5px", shadow: "0 1px 3px rgba(0,0,0,0.1)", shadowHover: "0 4px 12px rgba(0,0,0,0.15)", cardPadding: "1.25rem", backdropBlur: "blur(12px)", fontWeight: "600", spacing: "1.25rem", iconStroke: "1.5", buttonRadius: "0.625rem" },
    dark: {
      background: "#000000", card: "#1c1c1e", cardForeground: "#ffffff",
      popover: "#2c2c2e", secondary: "#2c2c2e", secondaryForeground: "#e5e5ea",
      muted: "#2c2c2e", mutedForeground: "#8e8e93", border: "rgba(255,255,255,0.1)",
      input: "#2c2c2e", sidebar: "rgba(0,0,0,0.8)", sidebarForeground: "#8e8e93",
      sidebarBorder: "rgba(255,255,255,0.08)",
    },
    light: {
      background: "#f2f2f7", card: "#ffffff", secondary: "#e5e5ea",
      muted: "#e5e5ea", mutedForeground: "#8e8e93", border: "rgba(0,0,0,0.08)",
      sidebar: "rgba(242,242,247,0.8)", sidebarBorder: "rgba(0,0,0,0.06)",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep navy, premium feel",
    preview: "linear-gradient(135deg, #0b1120 0%, #162240 100%)",
    layout: { radius: "0.875rem", borderWidth: "1px", shadow: "0 2px 8px rgba(0,0,0,0.2)", shadowHover: "0 8px 24px rgba(0,0,0,0.3)", cardPadding: "1.25rem", backdropBlur: "blur(8px)", fontWeight: "600", spacing: "1.5rem", iconStroke: "1.5", buttonRadius: "0.75rem" },
    dark: {
      background: "#0b1120", card: "#0f1729", cardForeground: "#e2e8f0",
      popover: "#162240", secondary: "#162240", secondaryForeground: "#cbd5e1",
      muted: "#162240", mutedForeground: "#64748b", border: "rgba(99,130,184,0.12)",
      input: "#162240", sidebar: "rgba(11,17,32,0.95)", sidebarForeground: "#64748b",
      sidebarBorder: "rgba(99,130,184,0.08)",
    },
    light: {
      background: "#f8fafc", card: "#ffffff", secondary: "#f1f5f9",
      muted: "#e2e8f0", mutedForeground: "#64748b", border: "rgba(0,0,0,0.06)",
      sidebar: "rgba(248,250,252,0.9)", sidebarBorder: "rgba(0,0,0,0.04)",
    },
  },
  {
    id: "dracula",
    label: "Dracula",
    description: "Purple-tinted dark with vivid accents",
    preview: "linear-gradient(135deg, #282a36 0%, #44475a 100%)",
    layout: { radius: "0.75rem", borderWidth: "1px", shadow: "0 2px 6px rgba(0,0,0,0.2)", shadowHover: "0 6px 20px rgba(0,0,0,0.3)", cardPadding: "1.25rem", backdropBlur: "none", fontWeight: "700", spacing: "1.25rem", iconStroke: "2", buttonRadius: "0.625rem" },
    dark: {
      background: "#282a36", card: "#2d303e", cardForeground: "#f8f8f2",
      popover: "#343746", secondary: "#44475a", secondaryForeground: "#f8f8f2",
      muted: "#44475a", mutedForeground: "#6272a4", border: "rgba(98,114,164,0.2)",
      input: "#44475a", sidebar: "rgba(40,42,54,0.95)", sidebarForeground: "#6272a4",
      sidebarBorder: "rgba(98,114,164,0.12)",
    },
    light: {
      background: "#f8f8f2", card: "#ffffff", secondary: "#f0f0e8",
      muted: "#e8e8e0", mutedForeground: "#6272a4", border: "rgba(0,0,0,0.08)",
      sidebar: "rgba(248,248,242,0.9)", sidebarBorder: "rgba(0,0,0,0.06)",
    },
  },
  {
    id: "nord",
    label: "Nord",
    description: "Arctic blue, calm and focused",
    preview: "linear-gradient(135deg, #2e3440 0%, #3b4252 50%, #434c5e 100%)",
    layout: { radius: "0.625rem", borderWidth: "1px", shadow: "0 1px 4px rgba(0,0,0,0.15)", shadowHover: "0 4px 16px rgba(0,0,0,0.2)", cardPadding: "1.25rem", backdropBlur: "none", fontWeight: "600", spacing: "1.25rem", iconStroke: "1.5", buttonRadius: "0.5rem" },
    dark: {
      background: "#2e3440", card: "#3b4252", cardForeground: "#eceff4",
      popover: "#434c5e", secondary: "#434c5e", secondaryForeground: "#e5e9f0",
      muted: "#434c5e", mutedForeground: "#81a1c1", border: "rgba(136,192,208,0.12)",
      input: "#434c5e", sidebar: "rgba(46,52,64,0.95)", sidebarForeground: "#81a1c1",
      sidebarBorder: "rgba(136,192,208,0.08)",
    },
    light: {
      background: "#eceff4", card: "#ffffff", secondary: "#e5e9f0",
      muted: "#d8dee9", mutedForeground: "#4c566a", border: "rgba(0,0,0,0.06)",
      sidebar: "rgba(236,239,244,0.9)", sidebarBorder: "rgba(0,0,0,0.04)",
    },
  },
  {
    id: "solarized",
    label: "Solarized",
    description: "Ethan Schoonover's precision palette",
    preview: "linear-gradient(135deg, #002b36 0%, #073642 100%)",
    layout: { radius: "0.5rem", borderWidth: "1px", shadow: "0 1px 3px rgba(0,0,0,0.12)", shadowHover: "0 4px 12px rgba(0,0,0,0.18)", cardPadding: "1.25rem", backdropBlur: "none", fontWeight: "600", spacing: "1.25rem", iconStroke: "1.5", buttonRadius: "0.375rem" },
    dark: {
      background: "#002b36", card: "#073642", cardForeground: "#fdf6e3",
      popover: "#073642", secondary: "#0a4050", secondaryForeground: "#eee8d5",
      muted: "#0a4050", mutedForeground: "#839496", border: "rgba(131,148,150,0.15)",
      input: "#073642", sidebar: "rgba(0,43,54,0.95)", sidebarForeground: "#839496",
      sidebarBorder: "rgba(131,148,150,0.1)",
    },
    light: {
      background: "#fdf6e3", card: "#ffffff", secondary: "#eee8d5",
      muted: "#eee8d5", mutedForeground: "#657b83", border: "rgba(0,0,0,0.06)",
      sidebar: "rgba(253,246,227,0.9)", sidebarBorder: "rgba(0,0,0,0.04)",
    },
  },
  {
    id: "monokai",
    label: "Monokai",
    description: "Rich dark with warm highlights",
    preview: "linear-gradient(135deg, #272822 0%, #3e3d32 100%)",
    layout: { radius: "0.5rem", borderWidth: "1px", shadow: "0 1px 3px rgba(0,0,0,0.15)", shadowHover: "0 4px 12px rgba(0,0,0,0.25)", cardPadding: "1rem", backdropBlur: "none", fontWeight: "600", spacing: "1.25rem", iconStroke: "2", buttonRadius: "0.375rem" },
    dark: {
      background: "#272822", card: "#2d2e27", cardForeground: "#f8f8f2",
      popover: "#3e3d32", secondary: "#3e3d32", secondaryForeground: "#f8f8f2",
      muted: "#3e3d32", mutedForeground: "#75715e", border: "rgba(117,113,94,0.2)",
      input: "#3e3d32", sidebar: "rgba(39,40,34,0.95)", sidebarForeground: "#75715e",
      sidebarBorder: "rgba(117,113,94,0.12)",
    },
    light: {
      background: "#fafaf5", card: "#ffffff", secondary: "#f0f0e8",
      muted: "#e8e8e0", mutedForeground: "#75715e", border: "rgba(0,0,0,0.06)",
      sidebar: "rgba(250,250,245,0.9)", sidebarBorder: "rgba(0,0,0,0.04)",
    },
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    description: "Pastel warmth, easy on the eyes",
    preview: "linear-gradient(135deg, #1e1e2e 0%, #302d41 100%)",
    layout: { radius: "1rem", borderWidth: "1px", shadow: "0 2px 6px rgba(0,0,0,0.15)", shadowHover: "0 6px 20px rgba(0,0,0,0.2)", cardPadding: "1.25rem", backdropBlur: "none", fontWeight: "600", spacing: "1.5rem", iconStroke: "1.5", buttonRadius: "0.75rem" },
    dark: {
      background: "#1e1e2e", card: "#24243a", cardForeground: "#cdd6f4",
      popover: "#302d41", secondary: "#302d41", secondaryForeground: "#bac2de",
      muted: "#302d41", mutedForeground: "#6c7086", border: "rgba(108,112,134,0.15)",
      input: "#302d41", sidebar: "rgba(30,30,46,0.95)", sidebarForeground: "#6c7086",
      sidebarBorder: "rgba(108,112,134,0.1)",
    },
    light: {
      background: "#eff1f5", card: "#ffffff", secondary: "#e6e9ef",
      muted: "#dce0e8", mutedForeground: "#6c6f85", border: "rgba(0,0,0,0.06)",
      sidebar: "rgba(239,241,245,0.9)", sidebarBorder: "rgba(0,0,0,0.04)",
    },
  },
  {
    id: "rosepine",
    label: "Rose Pine",
    description: "Elegant dark with muted rose tones",
    preview: "linear-gradient(135deg, #191724 0%, #1f1d2e 50%, #26233a 100%)",
    layout: { radius: "0.875rem", borderWidth: "1px", shadow: "0 2px 8px rgba(0,0,0,0.15)", shadowHover: "0 6px 20px rgba(0,0,0,0.25)", cardPadding: "1.25rem", backdropBlur: "none", fontWeight: "600", spacing: "1.5rem", iconStroke: "1.5", buttonRadius: "0.625rem" },
    dark: {
      background: "#191724", card: "#1f1d2e", cardForeground: "#e0def4",
      popover: "#26233a", secondary: "#26233a", secondaryForeground: "#e0def4",
      muted: "#26233a", mutedForeground: "#6e6a86", border: "rgba(110,106,134,0.15)",
      input: "#26233a", sidebar: "rgba(25,23,36,0.95)", sidebarForeground: "#6e6a86",
      sidebarBorder: "rgba(110,106,134,0.1)",
    },
    light: {
      background: "#faf4ed", card: "#fffaf3", secondary: "#f2e9e1",
      muted: "#f2e9de", mutedForeground: "#797593", border: "rgba(0,0,0,0.06)",
      sidebar: "rgba(250,244,237,0.9)", sidebarBorder: "rgba(0,0,0,0.04)",
    },
  },
];

export const DEFAULT_DESIGN_STYLE = "ios";

/**
 * Maps each design style ID to a CSS layout type.
 * Layout types correspond to [data-layout] CSS overrides in globals.css
 * that control shape, spacing, shadows, and structural behavior.
 */
const DESIGN_STYLE_TO_LAYOUT: Record<string, string> = {
  ios: "ios",
  material: "material",
  flat: "flat",
  glass: "glassmorphism",
  neumorphic: "neumorphism",
  // Color-palette-only styles use "default" layout
  midnight: "default",
  dracula: "default",
  nord: "default",
  solarized: "default",
  monokai: "default",
  catppuccin: "default",
  rosepine: "default",
};

export function getLayoutForDesignStyle(styleId: string): string {
  if (typeof styleId !== "string" || !Object.hasOwn(DESIGN_STYLE_TO_LAYOUT, styleId)) return "default";
  return DESIGN_STYLE_TO_LAYOUT[styleId];
}

export function applyDesignStyle(styleId: string, isDark: boolean) {
  const style = DESIGN_STYLES.find((s) => s.id === styleId) || DESIGN_STYLES.find((s) => s.id === DEFAULT_DESIGN_STYLE)!;
  const root = document.documentElement;
  const palette = isDark ? style.dark : style.light;

  // Set data-layout attribute for CSS-level layout overrides
  const layoutType = getLayoutForDesignStyle(style.id);
  root.setAttribute("data-layout", layoutType);
  try { localStorage.setItem("listblitz-layout", layoutType); } catch {}

  // Apply color palette
  root.style.setProperty("--background", palette.background);
  root.style.setProperty("--card", palette.card);
  if ("cardForeground" in palette) root.style.setProperty("--card-foreground", (palette as DesignStyle["dark"]).cardForeground);
  root.style.setProperty("--secondary", palette.secondary);
  if ("secondaryForeground" in palette) root.style.setProperty("--secondary-foreground", (palette as DesignStyle["dark"]).secondaryForeground);
  root.style.setProperty("--muted", palette.muted);
  root.style.setProperty("--muted-foreground", palette.mutedForeground);
  root.style.setProperty("--border", palette.border);
  if ("input" in palette) root.style.setProperty("--input", (palette as DesignStyle["dark"]).input);
  if ("popover" in palette) root.style.setProperty("--popover", (palette as DesignStyle["dark"]).popover);
  root.style.setProperty("--sidebar", palette.sidebar);
  if ("sidebarForeground" in palette) root.style.setProperty("--sidebar-foreground", (palette as DesignStyle["dark"]).sidebarForeground);
  root.style.setProperty("--sidebar-border", palette.sidebarBorder);

  // Apply layout properties (radius, spacing — for styles that use "default" layout)
  const layout = style.layout;
  root.style.setProperty("--radius", layout.radius);
}

export function getSavedDesignStyle(): string {
  if (typeof window === "undefined") return DEFAULT_DESIGN_STYLE;
  return localStorage.getItem("listblitz-design-style") || DEFAULT_DESIGN_STYLE;
}

export function saveDesignStyle(styleId: string) {
  localStorage.setItem("listblitz-design-style", styleId);
}
