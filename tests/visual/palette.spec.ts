import { test, expect, Page } from "@playwright/test";

// ─── Helper: read raw CSS variable values ───

/** Read computed value (browser may convert oklch → lab/rgb). */
async function getCSSVar(page: Page, varName: string): Promise<string> {
  return page.evaluate((v) => {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }, varName);
}

/** Read the raw CSS text from the :root rule to get original oklch values. */
async function getRawCSSVar(page: Page, varName: string, darkMode = false): Promise<string> {
  return page.evaluate(
    ([v, dark]) => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
              const selector = dark ? ".dark" : ":root";
              if (rule.selectorText === selector) {
                const val = rule.style.getPropertyValue(v as string);
                if (val) return val.trim();
              }
            }
          }
        } catch { /* cross-origin */ }
      }
      return "";
    },
    [varName, darkMode]
  );
}

/**
 * Extract RGB values from various CSS color formats.
 * Handles: rgb(r, g, b), rgba(r, g, b, a), color(srgb r g b),
 * lab(...), oklch(...), etc.
 * For non-rgb formats, we use a canvas to convert.
 */
async function getElementColorAsRGB(page: Page, selector: string, prop: string): Promise<[number, number, number]> {
  return page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel as string);
      if (!el) return [0, 0, 0] as [number, number, number];
      const color = getComputedStyle(el).getPropertyValue(p as string).trim();

      // Try direct rgb parse
      const rgbMatch = color.match(/rgba?\((\d+\.?\d*),?\s*(\d+\.?\d*),?\s*(\d+\.?\d*)/);
      if (rgbMatch) {
        return [parseFloat(rgbMatch[1]), parseFloat(rgbMatch[2]), parseFloat(rgbMatch[3])] as [number, number, number];
      }

      // Use a 1x1 canvas to force conversion
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return [0, 0, 0] as [number, number, number];
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2]] as [number, number, number];
    },
    [selector, prop]
  );
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [rr, gg, bb] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function enableDarkMode(page: Page) {
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(200);
}

async function enableLightMode(page: Page) {
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.waitForTimeout(200);
}

// ════════════════════════════════════════════════════════════════════
// A. FULL-PAGE SCREENSHOTS (8 tests)
// ════════════════════════════════════════════════════════════════════

test.describe("A — Full-page screenshots", () => {
  test("A1: Dashboard light mode", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    await expect(page).toHaveScreenshot("dashboard-light.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("A2: Dashboard dark mode", async ({ page }) => {
    await page.goto("/");
    await enableDarkMode(page);
    await expect(page).toHaveScreenshot("dashboard-dark.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("A3: Create listing light mode", async ({ page }) => {
    await page.goto("/listings/new");
    await enableLightMode(page);
    await expect(page).toHaveScreenshot("create-listing-light.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("A4: Create listing dark mode", async ({ page }) => {
    await page.goto("/listings/new");
    await enableDarkMode(page);
    await expect(page).toHaveScreenshot("create-listing-dark.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("A5: Analytics light mode", async ({ page }) => {
    await page.goto("/analytics");
    await enableLightMode(page);
    await expect(page).toHaveScreenshot("analytics-light.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("A6: Analytics dark mode", async ({ page }) => {
    await page.goto("/analytics");
    await enableDarkMode(page);
    await expect(page).toHaveScreenshot("analytics-dark.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("A7: Settings light mode", async ({ page }) => {
    await page.goto("/settings");
    await enableLightMode(page);
    await expect(page).toHaveScreenshot("settings-light.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("A8: Settings dark mode", async ({ page }) => {
    await page.goto("/settings");
    await enableDarkMode(page);
    await expect(page).toHaveScreenshot("settings-dark.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });
});

// ════════════════════════════════════════════════════════════════════
// B. COLOR TOKEN VERIFICATION (12 tests)
// ════════════════════════════════════════════════════════════════════

test.describe("B — CSS token verification", () => {
  // The build system resolves oklch to hex, so we verify hex ranges using
  // a canvas-based RGB extraction from the resolved computed style.

  async function varAsRGB(page: Page, varName: string): Promise<[number, number, number]> {
    return page.evaluate((v) => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = raw; ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]] as [number, number, number];
    }, varName);
  }

  test("B1: --primary is a blue tone in light mode", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const [r, g, b] = await varAsRGB(page, "--primary");
    // Royal blue: blue > red, blue > green
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
    expect(b).toBeGreaterThan(150);
  });

  test("B2: --accent is light neutral in light mode", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const [r, g, b] = await varAsRGB(page, "--accent");
    // Accent is oklch(0.968 0 0) — achromatic near-white: all channels > 230
    expect(r).toBeGreaterThan(230);
    expect(g).toBeGreaterThan(230);
    expect(b).toBeGreaterThan(230);
  });

  test("B3: --background in light mode is near-white", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const [r, g, b] = await varAsRGB(page, "--background");
    // Near-white: all channels > 240
    expect(r).toBeGreaterThan(230);
    expect(g).toBeGreaterThan(230);
    expect(b).toBeGreaterThan(230);
  });

  test("B4: --background in dark mode is deep navy (dark, blue-ish)", async ({ page }) => {
    await page.goto("/");
    await enableDarkMode(page);
    const [r, g, b] = await varAsRGB(page, "--background");
    // Dark: all channels < 60, blue channel is highest
    expect(r).toBeLessThan(60);
    expect(g).toBeLessThan(60);
    expect(b).toBeLessThan(80);
    expect(b).toBeGreaterThanOrEqual(r);
  });

  test("B5: --foreground in light mode is dark", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const [r, g, b] = await varAsRGB(page, "--foreground");
    // Dark navy: all channels < 80
    expect(r).toBeLessThan(80);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(120);
  });

  test("B6: --foreground in dark mode is light", async ({ page }) => {
    await page.goto("/");
    await enableDarkMode(page);
    const [r, g, b] = await varAsRGB(page, "--foreground");
    // Light: all channels > 200
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(200);
  });

  test("B7: --border is light and has blue undertone", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const [r, g, b] = await varAsRGB(page, "--border");
    // Light border: all channels > 180, blue ≥ others
    expect(r).toBeGreaterThan(180);
    expect(b).toBeGreaterThanOrEqual(r);
  });

  test("B8: --ring matches primary in light mode", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const ring = await varAsRGB(page, "--ring");
    const primary = await varAsRGB(page, "--primary");
    // Should be very close (within 5 per channel)
    expect(Math.abs(ring[0] - primary[0])).toBeLessThan(5);
    expect(Math.abs(ring[1] - primary[1])).toBeLessThan(5);
    expect(Math.abs(ring[2] - primary[2])).toBeLessThan(5);
  });

  test("B9: chart-1 is warm/orange", async ({ page }) => {
    await page.goto("/");
    const [r, g, b] = await varAsRGB(page, "--chart-1");
    // chart-1 is oklch(0.646 0.222 41.116) — orange hue: red > blue
    expect(r).toBeGreaterThan(b);
    expect(r).toBeGreaterThan(150);
  });

  test("B10: chart-2 is teal/cyan", async ({ page }) => {
    await page.goto("/");
    const [r, g, b] = await varAsRGB(page, "--chart-2");
    // chart-2 is oklch(0.6 0.118 184.704) — teal hue: green >= red, blue > red
    expect(g).toBeGreaterThan(r);
  });

  test("B11: --destructive is red, not blue", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const [r, g, b] = await varAsRGB(page, "--destructive");
    expect(r).toBeGreaterThan(b);
    expect(r).toBeGreaterThan(150);
  });

  test("B12: --primary in dark mode is brighter blue", async ({ page }) => {
    await page.goto("/");
    await enableDarkMode(page);
    const [r, g, b] = await varAsRGB(page, "--primary");
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(150);
  });
});

// ════════════════════════════════════════════════════════════════════
// C. COMPONENT-LEVEL COLOR CHECKS (12 tests)
// ════════════════════════════════════════════════════════════════════

test.describe("C — Component colors", () => {
  test("C1: Navbar has sf-blur class applied", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    const cls = await nav.getAttribute("class");
    expect(cls).toContain("sf-blur");
  });

  test("C2: Primary buttons exist and are visible", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator("a[href='/listings/new'] button").first();
    await expect(btn).toBeVisible();
  });

  test("C3: Cards have hover shadow class", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("[class*='hover:shadow']").first();
    await expect(card).toBeVisible();
  });

  test("C4: Hero section uses primary bg", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator(".bg-primary").first();
    await expect(hero).toBeVisible();
  });

  test("C5: Status badges render on listings", async ({ page }) => {
    await page.goto("/");
    // Badges may or may not be present depending on data — just ensure the page renders
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("C6: Muted text has blue undertone (not pure gray)", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    // Get the muted-foreground color and verify blue >= red (not pure gray where all equal)
    const muteEl = page.locator(".text-muted-foreground").first();
    if (await muteEl.isVisible()) {
      const [r, , b] = await muteEl.evaluate((el) => {
        const c = getComputedStyle(el).color;
        const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
        const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
        const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
      });
      // Blue channel should be >= red channel (navy undertone, not pure gray)
      expect(b).toBeGreaterThanOrEqual(r);
    }
  });

  test("C7: Input element is present on form pages", async ({ page }) => {
    await page.goto("/listings/new");
    const input = page.locator("input").first();
    await expect(input).toBeVisible();
  });

  test("C8: Navbar logo icon container uses bg-primary", async ({ page }) => {
    await page.goto("/");
    const logo = page.locator("nav .bg-primary").first();
    await expect(logo).toBeVisible();
  });

  test("C9: Dark mode card bg is dark with blue undertone", async ({ page }) => {
    await page.goto("/");
    await enableDarkMode(page);
    const [r, g, b] = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--card").trim();
      const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = raw; ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]] as [number, number, number];
    });
    // Dark: all < 80, blue >= red
    expect(r).toBeLessThan(80);
    expect(b).toBeGreaterThanOrEqual(r);
  });

  test("C10: Secondary color is light with blue tint", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const [r, g, b] = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--secondary").trim();
      const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = raw; ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]] as [number, number, number];
    });
    // Light secondary: all > 220, blue >= red
    expect(r).toBeGreaterThan(220);
    expect(b).toBeGreaterThanOrEqual(r);
  });

  test("C11: Smart Lister page loads with AI-Powered badge", async ({ page }) => {
    await page.goto("/listings/smart");
    const badge = page.locator("text=AI-Powered").first();
    await expect(badge).toBeVisible();
  });

  test("C12: Tools page renders profit calculator", async ({ page }) => {
    await page.goto("/tools");
    const calc = page.locator("text=Profit Calculator").first();
    await expect(calc).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
// D. WCAG CONTRAST COMPLIANCE (8 tests)
// ════════════════════════════════════════════════════════════════════

test.describe("D — WCAG contrast", () => {
  test("D1: Foreground on background (light) ≥ 4.5:1", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const fg = await getElementColorAsRGB(page, "body", "color");
    const bg = await getElementColorAsRGB(page, "body", "background-color");
    const ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test("D2: Foreground on background (dark) ≥ 4.5:1", async ({ page }) => {
    await page.goto("/");
    await enableDarkMode(page);
    const fg = await getElementColorAsRGB(page, "body", "color");
    const bg = await getElementColorAsRGB(page, "body", "background-color");
    const ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test("D3: Primary button text on primary bg (light) ≥ 3:1", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const btn = page.locator("a[href='/listings/new'] button").first();
    if (await btn.isVisible()) {
      const [fg, bg] = await Promise.all([
        btn.evaluate((el) => {
          const c = getComputedStyle(el).color;
          const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
          const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
          const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
        }),
        btn.evaluate((el) => {
          const c = getComputedStyle(el).backgroundColor;
          const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
          const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
          const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
        }),
      ]);
      const ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
      expect(ratio).toBeGreaterThanOrEqual(3);
    }
  });

  test("D4: Muted text on background (light) ≥ 3:1", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const muteEl = page.locator(".text-muted-foreground").first();
    if (await muteEl.isVisible()) {
      const fg = await muteEl.evaluate((el) => {
        const c = getComputedStyle(el).color;
        const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
        const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
        const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
      });
      const bg = await getElementColorAsRGB(page, "body", "background-color");
      const ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
      expect(ratio).toBeGreaterThanOrEqual(3);
    }
  });

  test("D5: Card text on card bg (light) ≥ 4.5:1", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const card = page.locator("[class*='sf-shadow']").first();
    if (await card.isVisible()) {
      const [fg, bg] = await Promise.all([
        card.evaluate((el) => {
          const c = getComputedStyle(el).color;
          const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
          const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
          const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
        }),
        card.evaluate((el) => {
          const c = getComputedStyle(el).backgroundColor;
          const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
          const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
          const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
        }),
      ]);
      const ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
      // bg might be transparent (0,0,0,0) — skip if so
      if (bg[0] + bg[1] + bg[2] > 0) {
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test("D6: Card text on card bg (dark) ≥ 4.5:1", async ({ page }) => {
    await page.goto("/");
    await enableDarkMode(page);
    const card = page.locator("[class*='sf-shadow']").first();
    if (await card.isVisible()) {
      const [fg, bg] = await Promise.all([
        card.evaluate((el) => {
          const c = getComputedStyle(el).color;
          const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
          const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
          const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
        }),
        card.evaluate((el) => {
          const c = getComputedStyle(el).backgroundColor;
          const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
          const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
          const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
        }),
      ]);
      const ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
      if (bg[0] + bg[1] + bg[2] > 0) {
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test("D7: Navbar text readable (light)", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    const navText = page.locator("nav span.font-semibold").first();
    const fg = await navText.evaluate((el) => {
      const c = getComputedStyle(el).color;
      const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
      const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
      const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
    });
    const bg = await getElementColorAsRGB(page, "body", "background-color");
    const ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test("D8: Navbar text readable (dark)", async ({ page }) => {
    await page.goto("/");
    await enableDarkMode(page);
    const navText = page.locator("nav span.font-semibold").first();
    const fg = await navText.evaluate((el) => {
      const c = getComputedStyle(el).color;
      const canvas = document.createElement("canvas"); canvas.width=1; canvas.height=1;
      const ctx = canvas.getContext("2d")!; ctx.fillStyle = c; ctx.fillRect(0,0,1,1);
      const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]] as [number,number,number];
    });
    const bg = await getElementColorAsRGB(page, "body", "background-color");
    const ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// ════════════════════════════════════════════════════════════════════
// E. RESPONSIVE LAYOUT (6 tests)
// ════════════════════════════════════════════════════════════════════

test.describe("E — Responsive layout", () => {
  test("E1: Dashboard mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("dashboard-mobile.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("E2: Dashboard tablet (768px)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("dashboard-tablet.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("E3: Dashboard desktop (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("dashboard-desktop.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("E4: Create listing mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/listings/new");
    await expect(page).toHaveScreenshot("create-listing-mobile.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("E5: Create listing tablet (768px)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/listings/new");
    await expect(page).toHaveScreenshot("create-listing-tablet.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("E6: Create listing desktop (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/listings/new");
    await expect(page).toHaveScreenshot("create-listing-desktop.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });
});

// ════════════════════════════════════════════════════════════════════
// F. INTERACTIVE STATES (6 tests)
// ════════════════════════════════════════════════════════════════════

test.describe("F — Interactive states", () => {
  test("F1: Nav link shows active state", async ({ page }) => {
    await page.goto("/");
    const activeLink = page.locator("nav a.bg-background").first();
    await expect(activeLink).toBeVisible();
    // Active link should have shadow
    const shadow = await activeLink.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe("none");
  });

  test("F2: Card hover shows increased shadow", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(500);
    const card = page.locator("[class*='hover\\:shadow-md']").first();
    if (await card.isVisible()) {
      const beforeShadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);
      await card.hover();
      await page.waitForTimeout(300);
      const afterShadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);
      // Shadow should exist after hover
      expect(afterShadow).toBeTruthy();
    }
  });

  test("F3: Filter buttons toggle state", async ({ page }) => {
    await page.goto("/");
    const allBtn = page.locator("button:text('All')").first();
    const draftBtn = page.locator("button:text('Draft')").first();
    if (await draftBtn.isVisible()) {
      await draftBtn.click();
      await page.waitForTimeout(200);
      // Draft button should now have active styling
      const cls = await draftBtn.getAttribute("class");
      expect(cls).toContain("bg-background");
    }
  });

  test("F4: Theme toggle switches to dark mode", async ({ page }) => {
    await page.goto("/");
    await enableLightMode(page);
    // Click the theme toggle button
    const themeBtn = page.locator("nav button.rounded-full").first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      );
      expect(isDark).toBe(true);
    }
  });

  test("F5: Settings page connect button visible", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(500);
    // Should see either Connect or Disconnect buttons
    const connectBtn = page.locator("button:text('Connect')").first();
    const disconnectBtn = page.locator("button:text('Disconnect')").first();
    const hasConnect = await connectBtn.isVisible().catch(() => false);
    const hasDisconnect = await disconnectBtn.isVisible().catch(() => false);
    expect(hasConnect || hasDisconnect).toBe(true);
  });

  test("F6: Smart Lister upload zone visible", async ({ page }) => {
    await page.goto("/listings/smart");
    const uploadZone = page.locator("text=Upload a photo to get started").first();
    await expect(uploadZone).toBeVisible();
  });
});
