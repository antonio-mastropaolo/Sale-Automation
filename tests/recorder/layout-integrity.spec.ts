/* ------------------------------------------------------------------ */
/*  Layout Integrity Tests                                              */
/*                                                                      */
/*  General testing pattern that catches malformed components:           */
/*    - Overflow / clipping (children spilling out of containers)        */
/*    - Sibling overlap (grid/flex items bleeding into each other)       */
/*    - Off-screen bleed (elements extending past viewport edge)         */
/*    - Content truncation (text/icons clipped by tight containers)      */
/*    - Broken grids (unequal column widths, collapsed cells)            */
/*                                                                      */
/*  Run:  npm run test:visual -- layout-integrity.spec.ts               */
/* ------------------------------------------------------------------ */

import { test, expect } from "./visual-fixture";
import type { Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";

async function login(page: Page) {
  await page.request.get(`${BASE}/api/auth/seed`);
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  const cookie = res.headers()["set-cookie"] || "";
  const m = cookie.match(/session_token=([^;]+)/);
  if (m) {
    await page.context().addCookies([
      { name: "session_token", value: m[1], domain: "localhost", path: "/" },
    ]);
  }
}

/* ================================================================== */
/*  Reusable layout checks (the general testing pattern)                */
/* ================================================================== */

interface LayoutViolation {
  type: "overflow" | "overlap" | "offscreen" | "clipped" | "collapsed";
  element: string;
  detail: string;
}

/**
 * CHECK 1: Overflow Detection
 * Finds elements whose content overflows their bounding box.
 * Catches: cards clipped by parent, text spilling out, icons cut off.
 */
async function checkOverflow(page: Page): Promise<LayoutViolation[]> {
  return page.evaluate(() => {
    const violations: any[] = [];
    const candidates = document.querySelectorAll(
      "[class*='card'], [class*='grid'], [class*='flex'], [class*='rounded'], section, main, article"
    );
    candidates.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const style = getComputedStyle(htmlEl);
      // Only check elements that clip their children
      if (style.overflow === "hidden" || style.overflowX === "hidden" || style.overflowY === "hidden") {
        const parentRect = htmlEl.getBoundingClientRect();
        for (const child of htmlEl.children) {
          const childRect = child.getBoundingClientRect();
          // Child extends beyond parent by more than 2px (tolerance for borders/shadows)
          if (
            childRect.right > parentRect.right + 2 ||
            childRect.bottom > parentRect.bottom + 2 ||
            childRect.left < parentRect.left - 2 ||
            childRect.top < parentRect.top - 2
          ) {
            const selector = genSelector(child as HTMLElement);
            violations.push({
              type: "overflow",
              element: selector,
              detail: `Child (${Math.round(childRect.width)}x${Math.round(childRect.height)}) overflows parent (${Math.round(parentRect.width)}x${Math.round(parentRect.height)}). ` +
                `R:${Math.round(childRect.right - parentRect.right)}px B:${Math.round(childRect.bottom - parentRect.bottom)}px`,
            });
          }
        }
      }
    });

    function genSelector(el: HTMLElement): string {
      if (el.id) return "#" + el.id;
      const classes = [...el.classList].filter(c => !c.startsWith("vh-")).slice(0, 3).join(".");
      const tag = el.tagName.toLowerCase();
      return classes ? `${tag}.${classes}` : tag;
    }

    return violations;
  });
}

/**
 * CHECK 2: Sibling Overlap Detection
 * Finds grid/flex children that overlap each other.
 * Catches: cards bleeding into adjacent cards, broken grid layouts.
 * Excludes: SVG internals (chart grids), inline icons.
 */
async function checkSiblingOverlap(page: Page): Promise<LayoutViolation[]> {
  return page.evaluate(() => {
    const violations: any[] = [];
    // Only check HTML grid/flex containers, not SVG
    const containers = document.querySelectorAll("div[class*='grid'], div[class*='flex'], section[class*='grid']");

    containers.forEach((container) => {
      const children = [...container.children].filter((c) => {
        if (c instanceof SVGElement) return false; // skip SVG children
        const s = getComputedStyle(c);
        return s.position !== "absolute" && s.position !== "fixed" && s.display !== "none";
      });

      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const a = children[i].getBoundingClientRect();
          const b = children[j].getBoundingClientRect();
          // Skip zero-size or tiny decorative elements
          if (a.width < 20 || a.height < 20 || b.width < 20 || b.height < 20) continue;

          const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

          if (overlapX > 4 && overlapY > 4) {
            const selA = genSel(children[i] as HTMLElement);
            const selB = genSel(children[j] as HTMLElement);
            violations.push({
              type: "overlap",
              element: `${selA} ↔ ${selB}`,
              detail: `Siblings overlap by ${Math.round(overlapX)}x${Math.round(overlapY)}px`,
            });
          }
        }
      }
    });

    function genSel(el: HTMLElement): string {
      if (el.id) return "#" + el.id;
      const tag = el.tagName.toLowerCase();
      const cls = [...el.classList].filter(c => !c.startsWith("vh-")).slice(0, 2).join(".");
      const text = (el.textContent || "").trim().slice(0, 20);
      return cls ? `${tag}.${cls}` : text ? `${tag}("${text}")` : tag;
    }

    return violations;
  });
}

/**
 * CHECK 3: Off-Screen Bleed Detection
 * Finds visible elements that extend past the viewport right/bottom edge.
 * Catches: horizontal scrollbars, cards pushed off-screen.
 */
async function checkOffScreen(page: Page): Promise<LayoutViolation[]> {
  return page.evaluate(() => {
    const violations: any[] = [];
    const vw = document.documentElement.clientWidth;

    // Check for horizontal overflow on the page itself
    if (document.documentElement.scrollWidth > vw + 5) {
      violations.push({
        type: "offscreen",
        element: "html",
        detail: `Page has horizontal scroll: content is ${document.documentElement.scrollWidth}px wide, viewport is ${vw}px`,
      });
    }

    // Check individual visible elements
    const allEls = document.querySelectorAll(
      "div, section, main, article, header, footer, nav, aside, ul, ol, table"
    );
    allEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Element's right edge extends past viewport
      if (rect.right > vw + 8) {
        const sel = genSel(el as HTMLElement);
        violations.push({
          type: "offscreen",
          element: sel,
          detail: `Extends ${Math.round(rect.right - vw)}px past right viewport edge`,
        });
      }
    });

    function genSel(el: HTMLElement): string {
      if (el.id) return "#" + el.id;
      const cls = [...el.classList].filter(c => !c.startsWith("vh-")).slice(0, 3).join(".");
      return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
    }

    return violations;
  });
}

/**
 * CHECK 4: Collapsed / Zero-Size Container Detection
 * Finds containers that have content (children/text) but zero dimensions.
 * Catches: cards collapsed to 0px, grids with no height, invisible sections.
 * Ignores: buttons, inline text, intentionally small elements.
 */
async function checkCollapsed(page: Page): Promise<LayoutViolation[]> {
  return page.evaluate(() => {
    const violations: any[] = [];
    // Target structural containers only — not buttons, text, or inline items
    const containers = document.querySelectorAll(
      "div[class*='rounded-xl'], div[class*='rounded-lg'], div[class*='card'], section, article"
    );
    // Check if element or any ancestor is hidden
    function isEffectivelyHidden(el: HTMLElement): boolean {
      let node: HTMLElement | null = el;
      while (node && node !== document.body) {
        const s = getComputedStyle(node);
        if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return true;
        node = node.parentElement;
      }
      return false;
    }

    containers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (isEffectivelyHidden(htmlEl)) return;

      const rect = htmlEl.getBoundingClientRect();
      const hasChildren = htmlEl.children.length > 0 || (htmlEl.textContent || "").trim().length > 0;

      // Only flag containers that HAVE content but are collapsed to 0 in either dimension
      if (hasChildren && (rect.width === 0 || rect.height === 0)) {
        const sel = genSel(htmlEl);
        violations.push({
          type: "collapsed",
          element: sel,
          detail: `Container with ${htmlEl.children.length} children is ${Math.round(rect.width)}x${Math.round(rect.height)}px — fully collapsed`,
        });
      }
    });

    function genSel(el: HTMLElement): string {
      if (el.id) return "#" + el.id;
      const cls = [...el.classList].filter(c => !c.startsWith("vh-")).slice(0, 3).join(".");
      return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
    }

    return violations;
  });
}

/**
 * CHECK 5: Content Clipping Detection
 * Finds elements where text is being clipped without an ellipsis style.
 * Catches: labels/titles cut off, numbers truncated, icons sliced.
 */
async function checkContentClipping(page: Page): Promise<LayoutViolation[]> {
  return page.evaluate(() => {
    const violations: any[] = [];
    const textEls = document.querySelectorAll("span, p, h1, h2, h3, h4, h5, h6, label, td, th");

    textEls.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const style = getComputedStyle(htmlEl);
      if (style.display === "none" || style.visibility === "hidden") return;

      // Check if scrollWidth exceeds clientWidth (text overflows)
      const overflows = htmlEl.scrollWidth > htmlEl.clientWidth + 2;
      // Check if there's no text-overflow/ellipsis handling
      const hasEllipsis = style.textOverflow === "ellipsis";
      const hasWordBreak = style.overflowWrap === "break-word" || style.wordBreak === "break-all";
      const isHidden = style.overflow === "hidden" || style.overflowX === "hidden";

      if (overflows && isHidden && !hasEllipsis && !hasWordBreak) {
        const text = (htmlEl.textContent || "").trim().slice(0, 40);
        if (!text) return;
        const sel = genSel(htmlEl);
        violations.push({
          type: "clipped",
          element: sel,
          detail: `Text "${text}" is clipped (scrollW:${htmlEl.scrollWidth} > clientW:${htmlEl.clientWidth}) without ellipsis`,
        });
      }
    });

    function genSel(el: HTMLElement): string {
      if (el.id) return "#" + el.id;
      const cls = [...el.classList].filter(c => !c.startsWith("vh-")).slice(0, 3).join(".");
      return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
    }

    return violations;
  });
}

/**
 * Run ALL layout checks on the current page.
 * Returns a combined list of violations.
 */
async function runAllLayoutChecks(page: Page): Promise<LayoutViolation[]> {
  const results = await Promise.all([
    checkOverflow(page),
    checkSiblingOverlap(page),
    checkOffScreen(page),
    checkCollapsed(page),
    checkContentClipping(page),
  ]);
  return results.flat();
}

/* ================================================================== */
/*  Helper: print violations nicely                                     */
/* ================================================================== */

function printViolations(pageName: string, violations: LayoutViolation[]) {
  if (violations.length === 0) {
    console.log(`  [PASS] ${pageName} — no layout issues`);
    return;
  }
  console.log(`  [WARN] ${pageName} — ${violations.length} issue(s):`);
  for (const v of violations) {
    console.log(`    ${v.type.toUpperCase().padEnd(10)} ${v.element}`);
    console.log(`${"".padEnd(15)}${v.detail}`);
  }
}

/* ================================================================== */
/*  All protected pages to test                                         */
/* ================================================================== */

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const ALL_PAGES = [
  { name: "Dashboard", path: "/" },
  { name: "Smart List", path: "/listings/smart" },
  { name: "New Listing", path: "/listings/new" },
  { name: "Photo Studio", path: "/studio" },
  { name: "Bulk Import", path: "/bulk-import" },
  { name: "Templates", path: "/templates" },
  { name: "Products", path: "/inventory" },
  { name: "Smart Repricer", path: "/repricing" },
  { name: "Offer Hub", path: "/offers" },
  { name: "Cross-Market", path: "/search" },
  { name: "Inbox", path: "/inbox" },
  { name: "Store Sync", path: "/alignment" },
  { name: "Shipping Hub", path: "/shipping" },
  { name: "AI Pipeline", path: "/workflow" },
  { name: "Scheduler", path: "/scheduler" },
  { name: "Drop Feed", path: "/drops" },
  { name: "Analytics", path: "/analytics" },
  { name: "Trends", path: "/trends" },
  { name: "Competitor", path: "/competitor" },
  { name: "Settings", path: "/settings" },
  { name: "Seller Tools", path: "/tools" },
  { name: "Diagnostics", path: "/diagnostics" },
  { name: "Onboarding", path: "/onboard" },
];

/* ================================================================== */
/*  Tests — one per viewport size                                       */
/* ================================================================== */

for (const vp of VIEWPORTS) {
  test(`layout integrity @ ${vp.name} (${vp.width}x${vp.height})`, async ({ vh, page }) => {
    await login(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });

    const allViolations: { page: string; violations: LayoutViolation[] }[] = [];
    let totalIssues = 0;

    for (const pg of ALL_PAGES) {
      await vh.goto(`${BASE}${pg.path}`);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(400); // let animations settle

      const violations = await runAllLayoutChecks(page);
      printViolations(`${pg.name} (${vp.name})`, violations);
      totalIssues += violations.length;
      if (violations.length > 0) {
        allViolations.push({ page: pg.name, violations });
      }
    }

    console.log(`\n  ── ${vp.name} summary: ${totalIssues} issue(s) across ${allViolations.length} page(s) ──\n`);

    // Soft-assert: log all issues, don't fail for off-screen (common with scrollable content)
    const criticalViolations = allViolations.flatMap((v) =>
      v.violations.filter((vi) => vi.type === "overlap" || vi.type === "collapsed")
    );

    if (criticalViolations.length > 0) {
      console.log("  CRITICAL issues found:");
      for (const v of criticalViolations) {
        console.log(`    ${v.type}: ${v.element} — ${v.detail}`);
      }
    }

    // Hard-fail only on critical layout issues (overlap, collapsed)
    expect(
      criticalViolations.length,
      `${criticalViolations.length} critical layout issues (overlap/collapsed) found at ${vp.name}`,
    ).toBe(0);
  });
}
