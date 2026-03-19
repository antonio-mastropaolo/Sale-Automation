/**
 * GUI Audit System — Page Detail Extractor
 *
 * Navigates to a page, extracts every visible element's geometry,
 * colors, typography, accessibility attributes, and takes a screenshot.
 * Saves the full PageSnapshot to disk as JSON.
 */

import type { Page } from "@playwright/test";
import type { ElementInfo, PageSnapshot } from "./types";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "docs", "gui-audit");

/** Ensure output directory exists */
function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Set color scheme on the page (light/dark).
 */
export async function setColorScheme(
  page: Page,
  scheme: "light" | "dark"
): Promise<void> {
  await page.evaluate((s) => {
    localStorage.setItem("theme", s);
    if (s === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, scheme);
  await page.waitForTimeout(300);
}

/**
 * Extract all meaningful elements from the current page.
 * Runs entirely in the browser context for performance.
 */
export async function extractElements(page: Page): Promise<ElementInfo[]> {
  return page.evaluate(() => {
    const INTERACTIVE_TAGS = new Set([
      "a", "button", "input", "select", "textarea", "details", "summary",
    ]);
    const INTERACTIVE_ROLES = new Set([
      "button", "link", "checkbox", "radio", "tab", "switch",
      "menuitem", "option", "combobox", "textbox", "slider",
    ]);

    /**
     * Build a stable CSS selector for an element.
     */
    function buildSelector(el: Element): string {
      const parts: string[] = [];
      let current: Element | null = el;
      while (current && current !== document.documentElement) {
        let piece = current.tagName.toLowerCase();
        if (current.id) {
          piece += `#${current.id}`;
          parts.unshift(piece);
          break;
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (c) => c.tagName === current!.tagName
          );
          if (siblings.length > 1) {
            const idx = siblings.indexOf(current) + 1;
            piece += `:nth-of-type(${idx})`;
          }
        }
        parts.unshift(piece);
        current = current.parentElement;
      }
      return parts.join(" > ");
    }

    /**
     * Parse any CSS color into RGB via a canvas.
     */
    function colorToRGB(color: string): [number, number, number] {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    }

    /**
     * Resolve aria-label or aria-labelledby text.
     */
    function getAriaLabel(el: Element): string {
      const label = el.getAttribute("aria-label");
      if (label) return label;
      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        const parts = labelledBy.split(/\s+/).map((id) => {
          const ref = document.getElementById(id);
          return ref?.textContent?.trim() || "";
        });
        return parts.filter(Boolean).join(" ");
      }
      // For inputs, check associated <label>
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) return lbl.textContent?.trim() || "";
        }
      }
      return "";
    }

    // Collect all elements that have visual presence
    const allElements = document.querySelectorAll(
      "body *, body"
    );

    const results: ElementInfo[] = [];
    const seen = new Set<Element>();

    for (const el of allElements) {
      if (seen.has(el)) continue;
      seen.add(el);

      const tag = el.tagName.toLowerCase();
      // Skip script, style, meta-like elements
      if (["script", "style", "link", "meta", "noscript", "br", "hr"].includes(tag)) continue;

      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      // Skip zero-size elements (but keep interactive ones)
      const isInteractive =
        INTERACTIVE_TAGS.has(tag) ||
        INTERACTIVE_ROLES.has(el.getAttribute("role") || "") ||
        el.hasAttribute("tabindex");

      if (rect.width === 0 && rect.height === 0 && !isInteractive) continue;

      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0;

      // Only include visible elements or hidden interactive ones (which are issues)
      if (!visible && !isInteractive) continue;

      // Limit to meaningful elements: text-bearing, interactive, or containers
      const text = (el.textContent || "").trim().substring(0, 120);
      const hasDirectText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim().length > 0
      );
      const isContainer =
        ["div", "section", "main", "aside", "header", "footer", "nav", "article"].includes(tag);

      if (!isInteractive && !hasDirectText && !isContainer && !text) continue;

      const zIndexRaw = style.zIndex;
      const zIndex = zIndexRaw === "auto" ? 0 : parseInt(zIndexRaw, 10) || 0;

      results.push({
        selector: buildSelector(el),
        tag,
        text: hasDirectText
          ? Array.from(el.childNodes)
              .filter((n) => n.nodeType === Node.TEXT_NODE)
              .map((n) => (n.textContent || "").trim())
              .join(" ")
              .substring(0, 120)
          : "",
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        fgColor: colorToRGB(style.color),
        bgColor: colorToRGB(style.backgroundColor),
        fontSize: parseFloat(style.fontSize) || 0,
        fontWeight: parseInt(style.fontWeight, 10) || 400,
        visible,
        interactive: isInteractive,
        ariaLabel: getAriaLabel(el),
        role: el.getAttribute("role") || "",
        zIndex,
        opacity: parseFloat(style.opacity) || 1,
        overflow: style.overflow,
      });
    }

    return results;
  });
}

/**
 * Extract a full PageSnapshot: navigate, set mode, gather elements, screenshot.
 */
export async function extractPageSnapshot(
  page: Page,
  route: string,
  colorScheme: "light" | "dark",
  viewport: { width: number; height: number } = { width: 1280, height: 800 }
): Promise<PageSnapshot> {
  ensureOutputDir();

  await page.setViewportSize(viewport);
  await page.goto(route, { waitUntil: "networkidle" });
  await setColorScheme(page, colorScheme);
  await page.waitForTimeout(500); // let animations settle

  const title = await page.title();
  const elements = await extractElements(page);

  const { docW, docH } = await page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    docH: document.documentElement.scrollHeight,
  }));

  // Save screenshot
  const safeName = route.replace(/\//g, "_").replace(/^_/, "") || "root";
  const screenshotName = `${safeName}-${colorScheme}-${viewport.width}x${viewport.height}.png`;
  const screenshotPath = path.join(OUTPUT_DIR, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const snapshot: PageSnapshot = {
    route,
    title,
    viewport,
    colorScheme,
    timestamp: new Date().toISOString(),
    elements,
    screenshotPath: screenshotName,
    documentHeight: docH,
    documentWidth: docW,
  };

  // Save snapshot JSON
  const jsonName = `${safeName}-${colorScheme}-${viewport.width}x${viewport.height}.json`;
  fs.writeFileSync(
    path.join(OUTPUT_DIR, jsonName),
    JSON.stringify(snapshot, null, 2)
  );

  return snapshot;
}
