/**
 * GUI Audit System — Visual Consistency Checker
 *
 * Analyzes a PageSnapshot and detects visual inconsistencies:
 *  - Low contrast (WCAG AA/AAA violations)
 *  - Overlapping elements
 *  - Truncated / overflowing text
 *  - Tiny text (< 12px)
 *  - Tiny interactive targets (< 44x44 touch target)
 *  - Missing accessibility labels
 *  - Hidden interactive elements
 *  - Off-screen elements
 *  - Empty visible containers
 *  - Z-index fighting
 */

import type {
  PageSnapshot,
  ElementInfo,
  AuditIssue,
  IssueSeverity,
  IssueCategory,
} from "./types";

let issueCounter = 0;

function nextId(): string {
  return `GUI-${String(++issueCounter).padStart(4, "0")}`;
}

/** Reset the counter between runs */
export function resetIssueCounter(): void {
  issueCounter = 0;
}

// ── Color Utilities ───────────────────────────────────────────────

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

// ── Geometry Utilities ────────────────────────────────────────────

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function overlapArea(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

function elementArea(el: ElementInfo): number {
  return el.rect.width * el.rect.height;
}

// ── Individual Checks ─────────────────────────────────────────────

function makeIssue(
  category: IssueCategory,
  severity: IssueSeverity,
  message: string,
  elements: ElementInfo[],
  route: string,
  colorScheme: "light" | "dark",
  suggestion: string,
  wcagRef?: string
): AuditIssue {
  return {
    id: nextId(),
    category,
    severity,
    message,
    elements: elements.map((e) => ({
      selector: e.selector,
      tag: e.tag,
      text: e.text,
      rect: e.rect,
    })),
    route,
    colorScheme,
    suggestion,
    wcagRef,
  };
}

/** Check 1: Text contrast ratio (WCAG 2.1 SC 1.4.3 / 1.4.6) */
function checkContrast(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const textElements = snapshot.elements.filter(
    (el) => el.visible && el.text.length > 0 && el.fontSize > 0
  );

  for (const el of textElements) {
    // Skip if bg is fully transparent (rgba 0,0,0 with no actual bg)
    const bgSum = el.bgColor[0] + el.bgColor[1] + el.bgColor[2];
    if (bgSum === 0 && el.tag !== "body") continue; // likely transparent

    const fgLum = relativeLuminance(el.fgColor);
    const bgLum = relativeLuminance(el.bgColor);
    const ratio = contrastRatio(fgLum, bgLum);

    // Large text: >= 18pt (24px) or >= 14pt bold (18.66px bold)
    const isLargeText =
      el.fontSize >= 24 || (el.fontSize >= 18.66 && el.fontWeight >= 700);

    const aaThreshold = isLargeText ? 3 : 4.5;
    const aaaThreshold = isLargeText ? 4.5 : 7;

    if (ratio < aaThreshold) {
      issues.push(
        makeIssue(
          "contrast",
          "critical",
          `Text "${el.text.substring(0, 40)}…" has contrast ratio ${ratio.toFixed(2)}:1 (requires ${aaThreshold}:1 for WCAG AA). FG: rgb(${el.fgColor}), BG: rgb(${el.bgColor})`,
          [el],
          snapshot.route,
          snapshot.colorScheme,
          `Increase contrast to at least ${aaThreshold}:1. Darken the text or lighten the background.`,
          "WCAG 2.1 SC 1.4.3"
        )
      );
    } else if (ratio < aaaThreshold) {
      issues.push(
        makeIssue(
          "contrast",
          "minor",
          `Text "${el.text.substring(0, 40)}…" has contrast ratio ${ratio.toFixed(2)}:1 (WCAG AAA requires ${aaaThreshold}:1)`,
          [el],
          snapshot.route,
          snapshot.colorScheme,
          `Consider increasing contrast to ${aaaThreshold}:1 for WCAG AAA compliance.`,
          "WCAG 2.1 SC 1.4.6"
        )
      );
    }
  }

  return issues;
}

/** Check 2: Overlapping elements */
function checkOverlaps(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const visible = snapshot.elements.filter(
    (el) => el.visible && el.rect.width > 0 && el.rect.height > 0
  );

  // Only check interactive and text-bearing elements for meaningful overlaps
  const meaningful = visible.filter(
    (el) => el.interactive || el.text.length > 0
  );

  for (let i = 0; i < meaningful.length; i++) {
    for (let j = i + 1; j < meaningful.length; j++) {
      const a = meaningful[i];
      const b = meaningful[j];

      // Skip if one is ancestor of the other (selector containment heuristic)
      if (
        a.selector.startsWith(b.selector) ||
        b.selector.startsWith(a.selector)
      )
        continue;

      if (!rectsOverlap(a.rect, b.rect)) continue;

      const area = overlapArea(a.rect, b.rect);
      const smallerArea = Math.min(elementArea(a), elementArea(b));
      if (smallerArea === 0) continue;

      const overlapRatio = area / smallerArea;

      // Significant overlap: > 50% of the smaller element
      if (overlapRatio > 0.5 && a.zIndex === b.zIndex) {
        const severity: IssueSeverity =
          a.interactive && b.interactive ? "critical" : "major";
        issues.push(
          makeIssue(
            "overlap",
            severity,
            `Elements overlap by ${Math.round(overlapRatio * 100)}%: <${a.tag}> "${a.text.substring(0, 30)}" and <${b.tag}> "${b.text.substring(0, 30)}" at same z-index (${a.zIndex})`,
            [a, b],
            snapshot.route,
            snapshot.colorScheme,
            "Adjust positioning, add margin/padding, or set explicit z-index to separate these elements."
          )
        );
      }
    }
  }

  return issues;
}

/** Check 3: Tiny text (below 12px) */
function checkTinyText(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const MIN_FONT_SIZE = 12;

  for (const el of snapshot.elements) {
    if (!el.visible || el.text.length === 0) continue;
    if (el.fontSize > 0 && el.fontSize < MIN_FONT_SIZE) {
      issues.push(
        makeIssue(
          "tiny-text",
          "major",
          `Text "${el.text.substring(0, 40)}…" uses ${el.fontSize}px font (minimum recommended: ${MIN_FONT_SIZE}px)`,
          [el],
          snapshot.route,
          snapshot.colorScheme,
          `Increase font size to at least ${MIN_FONT_SIZE}px for readability.`,
          "WCAG 2.1 SC 1.4.4"
        )
      );
    }
  }

  return issues;
}

/** Check 4: Tiny touch targets (below 44x44px for interactive elements) */
function checkTinyTargets(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const MIN_TARGET = 44;

  for (const el of snapshot.elements) {
    if (!el.interactive || !el.visible) continue;
    if (el.rect.width < MIN_TARGET || el.rect.height < MIN_TARGET) {
      // Allow inline text links to be smaller in height
      if (el.tag === "a" && el.rect.height >= 20 && el.rect.width >= MIN_TARGET) continue;

      issues.push(
        makeIssue(
          "tiny-target",
          "major",
          `Interactive <${el.tag}> "${el.text.substring(0, 30)}" is ${el.rect.width}x${el.rect.height}px (minimum: ${MIN_TARGET}x${MIN_TARGET}px)`,
          [el],
          snapshot.route,
          snapshot.colorScheme,
          `Increase the clickable area to at least ${MIN_TARGET}x${MIN_TARGET}px for touch accessibility.`,
          "WCAG 2.1 SC 2.5.5"
        )
      );
    }
  }

  return issues;
}

/** Check 5: Missing accessibility labels */
function checkMissingLabels(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const el of snapshot.elements) {
    if (!el.interactive || !el.visible) continue;

    const hasLabel =
      el.ariaLabel.length > 0 ||
      el.text.length > 0 ||
      el.role.length > 0;

    if (!hasLabel) {
      issues.push(
        makeIssue(
          "missing-label",
          "critical",
          `Interactive <${el.tag}> at (${el.rect.x}, ${el.rect.y}) has no text, aria-label, or role`,
          [el],
          snapshot.route,
          snapshot.colorScheme,
          "Add an aria-label, visible text, or title attribute for screen readers.",
          "WCAG 2.1 SC 4.1.2"
        )
      );
    }
  }

  return issues;
}

/** Check 6: Hidden interactive elements (present but invisible) */
function checkHiddenInteractive(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const el of snapshot.elements) {
    if (!el.interactive) continue;
    if (!el.visible && el.opacity === 0) {
      issues.push(
        makeIssue(
          "invisible-interactive",
          "major",
          `Interactive <${el.tag}> "${el.text.substring(0, 30) || el.ariaLabel}" is invisible (opacity: 0 or display: none)`,
          [el],
          snapshot.route,
          snapshot.colorScheme,
          "Either remove the element from the DOM or make it visible/focusable."
        )
      );
    }
  }

  return issues;
}

/** Check 7: Off-screen elements */
function checkOffscreen(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const el of snapshot.elements) {
    if (!el.visible || !el.interactive) continue;

    const fullyOffRight = el.rect.x >= snapshot.viewport.width;
    const fullyOffBottom = el.rect.y >= snapshot.documentHeight;
    const fullyOffLeft = el.rect.x + el.rect.width <= 0;
    const fullyOffTop = el.rect.y + el.rect.height <= 0;

    if (fullyOffRight || fullyOffBottom || fullyOffLeft || fullyOffTop) {
      issues.push(
        makeIssue(
          "offscreen",
          "major",
          `Interactive <${el.tag}> "${el.text.substring(0, 30)}" is completely off-screen at (${el.rect.x}, ${el.rect.y})`,
          [el],
          snapshot.route,
          snapshot.colorScheme,
          "Check positioning — element may need overflow or position adjustment."
        )
      );
    }
  }

  return issues;
}

/** Check 8: Empty visible containers (div/section with no text content) */
function checkEmptyContainers(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const containerTags = new Set(["div", "section", "article", "main"]);

  for (const el of snapshot.elements) {
    if (!el.visible || !containerTags.has(el.tag)) continue;
    if (el.rect.width < 100 || el.rect.height < 100) continue; // skip small ones

    // Check if this container has no text and a visible area
    if (el.text.length === 0 && el.rect.width > 200 && el.rect.height > 200) {
      // Only flag if it seems like a content area, not a layout wrapper
      const area = elementArea(el);
      if (area > 40000) {
        issues.push(
          makeIssue(
            "empty-container",
            "info",
            `Large visible <${el.tag}> (${el.rect.width}x${el.rect.height}px) appears empty`,
            [el],
            snapshot.route,
            snapshot.colorScheme,
            "Verify this container should have content, or add aria-hidden if decorative."
          )
        );
      }
    }
  }

  return issues;
}

/** Check 9: Text truncation / overflow */
function checkTruncation(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const el of snapshot.elements) {
    if (!el.visible || el.text.length === 0) continue;

    // Heuristic: if overflow is "hidden" and the element is very narrow for its text
    if (el.overflow === "hidden" || el.overflow === "clip") {
      // Estimate minimum width needed (rough: 7px per char for 14px font)
      const charWidth = (el.fontSize || 14) * 0.5;
      const estimatedWidth = el.text.length * charWidth;

      if (estimatedWidth > el.rect.width * 1.5 && el.rect.width < 200) {
        issues.push(
          makeIssue(
            "truncation",
            "minor",
            `Text "${el.text.substring(0, 40)}…" likely truncated in ${el.rect.width}px wide container (estimated need: ${Math.round(estimatedWidth)}px)`,
            [el],
            snapshot.route,
            snapshot.colorScheme,
            "Add text-overflow: ellipsis with a tooltip, or increase container width."
          )
        );
      }
    }
  }

  return issues;
}

// ── Main Checker ──────────────────────────────────────────────────

/**
 * Run all consistency checks on a page snapshot.
 */
export function runConsistencyChecks(snapshot: PageSnapshot): AuditIssue[] {
  const allIssues: AuditIssue[] = [
    ...checkContrast(snapshot),
    ...checkOverlaps(snapshot),
    ...checkTinyText(snapshot),
    ...checkTinyTargets(snapshot),
    ...checkMissingLabels(snapshot),
    ...checkHiddenInteractive(snapshot),
    ...checkOffscreen(snapshot),
    ...checkEmptyContainers(snapshot),
    ...checkTruncation(snapshot),
  ];

  return allIssues;
}
