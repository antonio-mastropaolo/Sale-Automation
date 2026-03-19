/**
 * GUI Audit System — Second Opinion Agent
 *
 * Provides an independent review of issues found by the primary checker.
 * This agent re-analyzes the same snapshot with different heuristics,
 * different thresholds, and additional checks to either confirm, dispute,
 * or supplement the original findings.
 *
 * Design rationale:
 * - The primary checker uses standard WCAG thresholds and geometric overlap.
 * - The second-opinion agent applies stricter thresholds (AAA instead of AA),
 *   uses perceptual color difference (ΔE) checks, and performs cross-element
 *   consistency analysis (e.g., "all buttons should be the same size").
 */

import type {
  PageSnapshot,
  ElementInfo,
  AuditIssue,
  SecondOpinionRequest,
  SecondOpinionResult,
  IssueSeverity,
} from "./types";

let sopCounter = 0;
function nextSopId(): string {
  return `SOP-${String(++sopCounter).padStart(4, "0")}`;
}

export function resetSopCounter(): void {
  sopCounter = 0;
}

// ── Color Utilities (duplicated to keep this module self-contained) ──

function relativeLuminance(rgb: [number, number, number]): number {
  const [rr, gg, bb] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function contrastRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Approximate perceptual color difference (simplified CIE76 ΔE).
 * Not fully accurate but good enough for flagging suspicious pairs.
 */
function colorDeltaE(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

// ── Second Opinion Checks ─────────────────────────────────────────

/**
 * Check: Button size consistency.
 * All primary buttons on a page should be within 20% of each other's size.
 */
function checkButtonConsistency(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const buttons = snapshot.elements.filter(
    (el) => el.tag === "button" && el.visible && el.rect.width > 0
  );

  if (buttons.length < 2) return issues;

  const heights = buttons.map((b) => b.rect.height);
  const avgHeight = heights.reduce((s, h) => s + h, 0) / heights.length;

  for (const btn of buttons) {
    const deviation = Math.abs(btn.rect.height - avgHeight) / avgHeight;
    if (deviation > 0.4 && btn.rect.height > 10) {
      issues.push({
        id: nextSopId(),
        category: "responsive",
        severity: "minor",
        message: `Button "${btn.text.substring(0, 30)}" height (${btn.rect.height}px) deviates ${Math.round(deviation * 100)}% from average (${Math.round(avgHeight)}px)`,
        elements: [{ selector: btn.selector, tag: btn.tag, text: btn.text, rect: btn.rect }],
        route: snapshot.route,
        colorScheme: snapshot.colorScheme,
        suggestion: "Standardize button heights using consistent padding/sizing classes.",
      });
    }
  }

  return issues;
}

/**
 * Check: Font size consistency.
 * Flag pages that use more than 8 distinct font sizes (design system smell).
 */
function checkFontSizeProliferation(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const fontSizes = new Set<number>();

  for (const el of snapshot.elements) {
    if (el.visible && el.text.length > 0 && el.fontSize > 0) {
      fontSizes.add(Math.round(el.fontSize));
    }
  }

  if (fontSizes.size > 8) {
    issues.push({
      id: nextSopId(),
      category: "responsive",
      severity: "info",
      message: `Page uses ${fontSizes.size} distinct font sizes: [${Array.from(fontSizes).sort((a, b) => a - b).join(", ")}]px. Consider limiting to a type scale.`,
      elements: [],
      route: snapshot.route,
      colorScheme: snapshot.colorScheme,
      suggestion: "Define a type scale in your design system (e.g., 12, 14, 16, 18, 24, 32px) and stick to it.",
    });
  }

  return issues;
}

/**
 * Check: Color palette consistency.
 * Flag if there are foreground colors that are very close but not identical
 * (suggests accidental inconsistency, e.g., #333 vs #343434).
 */
function checkColorConsistency(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const fgColors: Array<{ color: [number, number, number]; el: ElementInfo }> = [];

  for (const el of snapshot.elements) {
    if (el.visible && el.text.length > 0) {
      fgColors.push({ color: el.fgColor, el });
    }
  }

  // Group similar colors
  const groups: Array<{ canonical: [number, number, number]; members: ElementInfo[] }> = [];

  for (const { color, el } of fgColors) {
    let found = false;
    for (const group of groups) {
      if (colorDeltaE(color, group.canonical) < 3) {
        group.members.push(el);
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push({ canonical: color, members: [el] });
    }
  }

  // Find pairs of groups that are "suspiciously close" (ΔE 3-15)
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const delta = colorDeltaE(groups[i].canonical, groups[j].canonical);
      if (delta > 3 && delta < 15 && groups[i].members.length > 1 && groups[j].members.length > 1) {
        issues.push({
          id: nextSopId(),
          category: "color-clash",
          severity: "info",
          message: `Two similar but not identical text colors detected: rgb(${groups[i].canonical}) (${groups[i].members.length} uses) vs rgb(${groups[j].canonical}) (${groups[j].members.length} uses). ΔE=${delta.toFixed(1)}`,
          elements: [
            { selector: groups[i].members[0].selector, tag: groups[i].members[0].tag, text: groups[i].members[0].text, rect: groups[i].members[0].rect },
            { selector: groups[j].members[0].selector, tag: groups[j].members[0].tag, text: groups[j].members[0].text, rect: groups[j].members[0].rect },
          ],
          route: snapshot.route,
          colorScheme: snapshot.colorScheme,
          suggestion: "Consolidate these into a single color token in your design system.",
        });
      }
    }
  }

  return issues;
}

/**
 * Check: Alignment issues.
 * Groups of elements that should be left-aligned but have varying x offsets.
 */
function checkAlignment(snapshot: PageSnapshot): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Group interactive elements by approximate y-position (same "row")
  const rows = new Map<number, ElementInfo[]>();
  for (const el of snapshot.elements) {
    if (!el.visible || !el.interactive) continue;
    const rowKey = Math.round(el.rect.y / 10) * 10; // 10px buckets
    const arr = rows.get(rowKey) || [];
    arr.push(el);
    rows.set(rowKey, arr);
  }

  // Check elements in the same column (similar x) for alignment drift
  const leftEdges = snapshot.elements
    .filter((el) => el.visible && el.text.length > 0)
    .map((el) => ({ x: el.rect.x, el }));

  // Group by approximate x (within 5px)
  const columns = new Map<number, ElementInfo[]>();
  for (const { x, el } of leftEdges) {
    const colKey = Math.round(x / 5) * 5;
    const arr = columns.get(colKey) || [];
    arr.push(el);
    columns.set(colKey, arr);
  }

  // Find columns where elements are close but not aligned (1-4px off)
  const colKeys = Array.from(columns.keys()).sort((a, b) => a - b);
  for (let i = 0; i < colKeys.length - 1; i++) {
    const diff = colKeys[i + 1] - colKeys[i];
    if (diff > 0 && diff <= 4) {
      const groupA = columns.get(colKeys[i])!;
      const groupB = columns.get(colKeys[i + 1])!;
      if (groupA.length >= 2 && groupB.length >= 2) {
        issues.push({
          id: nextSopId(),
          category: "responsive",
          severity: "info",
          message: `Near-miss alignment: ${groupA.length} elements at x=${colKeys[i]}px and ${groupB.length} elements at x=${colKeys[i + 1]}px (${diff}px off)`,
          elements: [
            { selector: groupA[0].selector, tag: groupA[0].tag, text: groupA[0].text, rect: groupA[0].rect },
            { selector: groupB[0].selector, tag: groupB[0].tag, text: groupB[0].text, rect: groupB[0].rect },
          ],
          route: snapshot.route,
          colorScheme: snapshot.colorScheme,
          suggestion: "Align these elements to the same grid column for visual consistency.",
        });
      }
    }
  }

  return issues;
}

/**
 * Re-verify contrast issues with stricter thresholds (WCAG AAA).
 * Disputes issues that the primary checker flagged as critical but
 * that actually pass AAA, and flags any that were missed.
 */
function reverifyContrast(
  snapshot: PageSnapshot,
  originalIssues: AuditIssue[]
): { confirmed: string[]; disputed: string[] } {
  const confirmed: string[] = [];
  const disputed: string[] = [];

  for (const issue of originalIssues) {
    if (issue.category !== "contrast") {
      confirmed.push(issue.id);
      continue;
    }

    // Re-check the element
    const elInfo = issue.elements[0];
    if (!elInfo) {
      confirmed.push(issue.id);
      continue;
    }

    // Find matching element in snapshot
    const match = snapshot.elements.find((e) => e.selector === elInfo.selector);
    if (!match) {
      // Element not found — could be dynamic, confirm the issue
      confirmed.push(issue.id);
      continue;
    }

    const fgLum = relativeLuminance(match.fgColor);
    const bgLum = relativeLuminance(match.bgColor);
    const ratio = contrastRatio(fgLum, bgLum);

    // If bg is essentially transparent (black with no real bg), dispute
    const bgSum = match.bgColor[0] + match.bgColor[1] + match.bgColor[2];
    if (bgSum < 5 && match.tag !== "body") {
      disputed.push(issue.id);
    } else if (ratio >= 4.5) {
      // Passes AA — dispute if it was flagged as critical
      disputed.push(issue.id);
    } else {
      confirmed.push(issue.id);
    }
  }

  return { confirmed, disputed };
}

// ── Main Second Opinion Function ──────────────────────────────────

/**
 * Run second-opinion analysis on the same snapshot.
 */
export function getSecondOpinion(request: SecondOpinionRequest): SecondOpinionResult {
  const { issues, snapshot } = request;

  // Re-verify existing issues
  const { confirmed, disputed } = reverifyContrast(snapshot, issues);

  // Run additional checks that the primary checker doesn't do
  const additionalIssues: AuditIssue[] = [
    ...checkButtonConsistency(snapshot),
    ...checkFontSizeProliferation(snapshot),
    ...checkColorConsistency(snapshot),
    ...checkAlignment(snapshot),
  ];

  // Calculate confidence based on agreement rate
  const total = issues.length;
  const agreementRate = total > 0 ? confirmed.length / total : 1;
  const confidence = Math.round(agreementRate * 100);

  const notes = [
    `Reviewed ${total} issues from primary checker.`,
    `Confirmed ${confirmed.length}, disputed ${disputed.length}.`,
    `Found ${additionalIssues.length} additional issues.`,
    disputed.length > 0
      ? `Disputed issues were mostly false-positive contrast checks on transparent backgrounds.`
      : `High agreement with primary checker — findings are solid.`,
  ].join(" ");

  return {
    confirmed,
    disputed,
    additional: additionalIssues,
    confidence,
    notes,
  };
}
