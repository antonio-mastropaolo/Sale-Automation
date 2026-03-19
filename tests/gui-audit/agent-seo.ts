/**
 * TrendSmart QA — SEO Agent
 *
 * Audits every page for search engine optimization and HTML semantics:
 *  - Title tag presence and length
 *  - Meta description
 *  - Open Graph tags (og:title, og:description, og:image)
 *  - Canonical URL
 *  - Heading hierarchy (single h1, proper nesting)
 *  - Image alt text
 *  - Language attribute on <html>
 *  - Semantic HTML usage (nav, main, article, section, aside)
 *  - Broken/empty anchor text
 *  - Mobile viewport meta tag
 *
 * This replaces running Screaming Frog or ahrefs site audit.
 */

import type { Page } from "@playwright/test";
import type { BugReport, SEOAudit, AgentName } from "./agent-types";

const AGENT: AgentName = "seo";
let bugCounter = 0;

function bugId(): string {
  return `SEO-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetSeoCounter(): void {
  bugCounter = 0;
}

function makeBug(
  title: string,
  severity: "critical" | "major" | "minor" | "cosmetic",
  route: string,
  steps: string[],
  expected: string,
  actual: string,
  suggestedFix: string,
  labels: string[] = [],
  confidence = 85
): BugReport {
  const body = [
    `## SEO Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**Found by:** SEO Agent (automated)`,
    ``,
    `### Steps to Reproduce`,
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `### Expected`,
    expected,
    ``,
    `### Actual`,
    actual,
    ``,
    `### Suggested Fix`,
    suggestedFix,
  ].join("\n");

  return {
    id: bugId(),
    title,
    foundBy: AGENT,
    severity,
    labels: ["bug", "seo", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
  };
}

// ── Page SEO Audit ────────────────────────────────────────────────

async function auditPage(page: Page, route: string): Promise<{ audit: SEOAudit; bugs: BugReport[] }> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle", timeout: 15000 });

  const seoData = await page.evaluate(() => {
    const title = document.title || "";
    const metaDesc = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const viewport = document.querySelector('meta[name="viewport"]');
    const lang = document.documentElement.lang;

    // Headings
    const h1s = document.querySelectorAll("h1");
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(
      (h) => parseInt(h.tagName.substring(1))
    );

    // Check heading order (no skipping levels)
    let headingOrderValid = true;
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) {
        headingOrderValid = false;
        break;
      }
    }

    // Images
    const images = document.querySelectorAll("img");
    let imgsMissingAlt = 0;
    for (const img of images) {
      if (!img.alt && !img.getAttribute("aria-label")) {
        imgsMissingAlt++;
      }
    }

    // Semantic elements
    const hasNav = document.querySelectorAll("nav").length > 0;
    const hasMain = document.querySelectorAll("main").length > 0;
    const hasArticle = document.querySelectorAll("article").length > 0;
    const hasSection = document.querySelectorAll("section").length > 0;
    const hasAside = document.querySelectorAll("aside").length > 0;
    const semanticCount = [hasNav, hasMain, hasArticle, hasSection, hasAside].filter(Boolean).length;

    // Links
    const links = document.querySelectorAll("a");
    let emptyLinks = 0;
    for (const link of links) {
      const text = (link.textContent || "").trim();
      const ariaLabel = link.getAttribute("aria-label") || "";
      if (!text && !ariaLabel && !link.querySelector("img, svg")) {
        emptyLinks++;
      }
    }

    return {
      title,
      titleLength: title.length,
      hasMetaDescription: !!metaDesc,
      descriptionLength: metaDesc?.getAttribute("content")?.length || 0,
      hasCanonical: !!canonical,
      hasOgTitle: !!ogTitle,
      hasOgDescription: !!ogDesc,
      hasOgImage: !!ogImage,
      hasViewport: !!viewport,
      hasLangAttr: !!lang,
      lang,
      h1Count: h1s.length,
      headingOrderValid,
      headingLevels: headings,
      imgsMissingAlt,
      totalImages: images.length,
      semanticCount,
      hasNav,
      hasMain,
      emptyLinks,
    };
  });

  const issues: string[] = [];

  // Title checks
  if (!seoData.title || seoData.titleLength === 0) {
    issues.push("Missing page title");
    bugs.push(makeBug(
      `Missing <title> on ${route}`,
      "major", route,
      [`Navigate to ${route}`, `Inspect the <title> tag`],
      "Every page should have a unique, descriptive <title>",
      "Page has no <title> or it's empty",
      "Add a title using Next.js metadata export or <Head> component.",
      ["title"], 90,
    ));
  } else if (seoData.titleLength < 20) {
    issues.push(`Title too short (${seoData.titleLength} chars)`);
    bugs.push(makeBug(
      `Short title on ${route}: "${seoData.title}"`,
      "minor", route,
      [`Navigate to ${route}`, `Title: "${seoData.title}" (${seoData.titleLength} chars)`],
      "Page title should be 20-60 characters",
      `Title is only ${seoData.titleLength} characters`,
      "Write a more descriptive title (30-60 chars) that includes relevant keywords.",
      ["title"], 75,
    ));
  } else if (seoData.titleLength > 70) {
    issues.push(`Title too long (${seoData.titleLength} chars)`);
  }

  // Meta description
  if (!seoData.hasMetaDescription) {
    issues.push("Missing meta description");
    bugs.push(makeBug(
      `Missing meta description on ${route}`,
      "minor", route,
      [`Navigate to ${route}`, `Check for <meta name="description">`],
      "Every page should have a meta description (120-160 chars)",
      "No meta description tag found",
      "Add a meta description via Next.js metadata export.",
      ["meta-description"], 80,
    ));
  } else if (seoData.descriptionLength < 50 || seoData.descriptionLength > 160) {
    issues.push(`Meta description length: ${seoData.descriptionLength} (ideal: 120-160)`);
  }

  // Open Graph
  const missingOg: string[] = [];
  if (!seoData.hasOgTitle) missingOg.push("og:title");
  if (!seoData.hasOgDescription) missingOg.push("og:description");
  if (!seoData.hasOgImage) missingOg.push("og:image");

  if (missingOg.length > 0) {
    issues.push(`Missing OG tags: ${missingOg.join(", ")}`);
    bugs.push(makeBug(
      `Missing Open Graph tags on ${route}`,
      "minor", route,
      [`Navigate to ${route}`, `Missing: ${missingOg.join(", ")}`],
      "Pages should have og:title, og:description, og:image for social sharing",
      `Missing: ${missingOg.join(", ")}`,
      "Add Open Graph metadata in the Next.js page metadata export.",
      ["open-graph"], 70,
    ));
  }

  // Heading hierarchy
  if (seoData.h1Count === 0) {
    issues.push("No <h1> tag found");
    bugs.push(makeBug(
      `Missing <h1> on ${route}`,
      "major", route,
      [`Navigate to ${route}`, `Search for <h1> elements`],
      "Every page should have exactly one <h1>",
      "No <h1> found on the page",
      "Add a single <h1> element as the main page heading.",
      ["heading-hierarchy"], 85,
    ));
  } else if (seoData.h1Count > 1) {
    issues.push(`Multiple <h1> tags (${seoData.h1Count})`);
    bugs.push(makeBug(
      `Multiple <h1> tags on ${route}: ${seoData.h1Count}`,
      "minor", route,
      [`Navigate to ${route}`, `Found ${seoData.h1Count} <h1> elements`],
      "Pages should have exactly one <h1>",
      `Found ${seoData.h1Count} <h1> tags`,
      "Keep only one <h1> and change the rest to <h2> or lower.",
      ["heading-hierarchy"], 75,
    ));
  }

  if (!seoData.headingOrderValid) {
    issues.push("Heading levels skip (e.g., h1 → h3)");
    bugs.push(makeBug(
      `Heading hierarchy broken on ${route}`,
      "minor", route,
      [`Navigate to ${route}`, `Heading levels: ${seoData.headingLevels.join(", ")}`],
      "Headings should follow a proper hierarchy (h1 → h2 → h3, no skipping)",
      `Heading levels skip: ${seoData.headingLevels.join(" → ")}`,
      "Fix the heading hierarchy so levels increment by one.",
      ["heading-hierarchy"], 70,
    ));
  }

  // Images missing alt
  if (seoData.imgsMissingAlt > 0) {
    bugs.push(makeBug(
      `${seoData.imgsMissingAlt} images missing alt text on ${route}`,
      seoData.imgsMissingAlt > 5 ? "major" : "minor", route,
      [`Navigate to ${route}`, `${seoData.imgsMissingAlt} of ${seoData.totalImages} images lack alt text`],
      "All images should have descriptive alt text",
      `${seoData.imgsMissingAlt} images without alt attribute`,
      "Add meaningful alt text to all <img> elements. Use alt='' for purely decorative images.",
      ["alt-text", "accessibility"], 85,
    ));
    issues.push(`${seoData.imgsMissingAlt} images missing alt`);
  }

  // Mobile viewport
  if (!seoData.hasViewport) {
    issues.push("Missing viewport meta tag");
    bugs.push(makeBug(
      `Missing viewport meta tag on ${route}`,
      "major", route,
      [`Navigate to ${route}`, `Check for <meta name="viewport">`],
      'Every page should have <meta name="viewport" content="width=device-width, initial-scale=1">',
      "No viewport meta tag found",
      "Add viewport meta tag in the root layout. Next.js usually handles this automatically.",
      ["viewport", "mobile"], 90,
    ));
  }

  // Empty link text
  if (seoData.emptyLinks > 0) {
    issues.push(`${seoData.emptyLinks} links with empty text`);
    bugs.push(makeBug(
      `${seoData.emptyLinks} links with no accessible text on ${route}`,
      seoData.emptyLinks > 5 ? "major" : "minor", route,
      [`Navigate to ${route}`, `Found ${seoData.emptyLinks} <a> elements with no text, aria-label, or child image`],
      "All links should have descriptive text or an aria-label",
      `${seoData.emptyLinks} links have no accessible name`,
      "Add text content or aria-label to all <a> elements. For icon-only links, use aria-label.",
      ["empty-links", "accessibility"], 80,
    ));
  }

  // Language attribute
  if (!seoData.hasLangAttr) {
    issues.push("Missing lang attribute on <html>");
    bugs.push(makeBug(
      `Missing lang attribute on <html>`,
      "minor", route,
      [`Inspect <html> tag`, `No lang attribute found`],
      '<html> should have lang="en" (or appropriate language)',
      "Missing lang attribute",
      'Add lang="en" to the <html> element in layout.tsx.',
      ["lang-attr"], 90,
    ));
  }

  // Semantic score (0-100)
  const semanticScore = Math.min(100, seoData.semanticCount * 20);

  const audit: SEOAudit = {
    route,
    hasTitle: seoData.titleLength > 0,
    titleLength: seoData.titleLength,
    hasMetaDescription: seoData.hasMetaDescription,
    descriptionLength: seoData.descriptionLength,
    hasCanonical: seoData.hasCanonical,
    hasOgTitle: seoData.hasOgTitle,
    hasOgDescription: seoData.hasOgDescription,
    hasOgImage: seoData.hasOgImage,
    h1Count: seoData.h1Count,
    headingOrder: seoData.headingOrderValid,
    imgsMissingAlt: seoData.imgsMissingAlt,
    totalImages: seoData.totalImages,
    hasLangAttr: seoData.hasLangAttr,
    semanticScore,
    issues,
  };

  return { audit, bugs };
}

// ── Main SEO Agent ────────────────────────────────────────────────

export async function runSeoAgent(
  page: Page,
  routes: string[]
): Promise<{ audits: SEOAudit[]; bugs: BugReport[] }> {
  const allAudits: SEOAudit[] = [];
  const allBugs: BugReport[] = [];

  for (const route of routes) {
    try {
      console.log(`    [SEO] ${route}`);
      const { audit, bugs } = await auditPage(page, route);
      allAudits.push(audit);
      allBugs.push(...bugs);

      const issueCount = audit.issues.length;
      if (issueCount > 0) {
        console.log(`      ${issueCount} issue(s)`);
      }
    } catch (err) {
      console.error(`    [SEO] FAILED ${route}: ${(err as Error).message}`);
    }
  }

  return { audits: allAudits, bugs: allBugs };
}
