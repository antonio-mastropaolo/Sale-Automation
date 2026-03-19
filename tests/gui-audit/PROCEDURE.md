# TrendSmart QA System — Full Procedure

## What This Is

A **multi-agent automated QA system** that replaces manual testing.
Instead of hiring a tester to click through your app and file bugs,
you run one command and get GitHub-issue-ready bug reports.

## Architecture

**12 specialized agents** run in sequence, each targeting a different quality dimension:

```
┌───────────────────────────────────────────────────────────────────┐
│                    QA Runner (qa.spec.ts)                         │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐        │
│  │  Visual   │ │  Logic   │ │   API    │ │    Flow      │        │
│  │  Agent    │ │  Agent   │ │  Agent   │ │    Agent     │        │
│  │ 9 checks │ │ 11 checks│ │ 90+ tests│ │  20 journeys │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘        │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐        │
│  │   Perf   │ │ Security │ │   Data   │ │     SEO      │        │
│  │  Agent   │ │  Agent   │ │ Integrity│ │    Agent     │        │
│  │ 11 checks│ │ 14 checks│ │ 8 checks │ │  12 checks  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘        │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐        │
│  │Regression│ │  State   │ │  A11y    │ │   Network    │        │
│  │  Agent   │ │  Agent   │ │  Agent   │ │    Agent     │        │
│  │ 3vp × 2t │ │ 9 checks │ │ 11 checks│ │  6 checks   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  Bug Reporter (dedup → score → trend → md/csv/json)    │      │
│  └────────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────────┘
```

### Agent 1: Visual Agent
**What it does:** Opens each page, extracts every DOM element's position, color, font,
and accessibility attributes. Then runs 9 automated checks.

**Checks:**
| # | Check | What it catches | WCAG |
|---|-------|----------------|------|
| 1 | Contrast | Text unreadable against background | 1.4.3 |
| 2 | Overlap | Elements covering each other | — |
| 3 | Tiny text | Font < 12px | 1.4.4 |
| 4 | Tiny targets | Buttons < 44x44px | 2.5.5 |
| 5 | Missing labels | No aria-label on interactive elements | 4.1.2 |
| 6 | Hidden interactive | Invisible buttons/inputs in DOM | — |
| 7 | Off-screen | Interactive elements outside viewport | — |
| 8 | Empty containers | Large visible divs with no content | — |
| 9 | Truncation | Text clipped by overflow:hidden | — |

**Second Opinion Agent** then re-analyzes with different heuristics:
- Button size consistency (all buttons should be similar size)
- Font size proliferation (>8 sizes = design system smell)
- Color palette consistency (near-duplicate colors = accident)
- Alignment drift (elements 1-4px off = sloppy layout)

### Agent 2: Logic Agent (11 checks)
**What it does:** Navigates each page like a user and checks the rendered data.

| # | Check | What it catches |
|---|-------|----------------|
| 1 | Page loads | HTTP errors, blank pages, crashes |
| 2 | Console errors | JS exceptions during load |
| 3 | Price display | $0, negative, NaN prices |
| 4 | Broken links | href="#", empty href, javascript:void |
| 5 | Empty states | "No items" shown alongside actual data |
| 6 | Form validation | Missing `<form>` wrappers, no validation |
| 7 | Broken images | Images that fail to load |
| 8 | Placeholder data | Lorem ipsum, TODO, test@example.com |
| 9 | Z-index overlaps | Interactive elements obscured by other content |
| 10 | Stuck toasts | Notifications visible on fresh page load |
| 11 | Text truncation | Text clipped without ellipsis indicator |

### Agent 3: API Agent (90+ tests)
**What it does:** Hits every API endpoint with both valid and invalid data.

**90+ test cases** covering all 52 endpoints:
- Listings CRUD, auth, settings, repricing, offers, inbox
- Scheduler, export, templates, search, image-search
- All AI endpoints, diagnostics, health-check
- XSS sanitization, pagination, concurrent requests
- Response time auditing (flags > 3s endpoints)

### Agent 4: Flow Agent (20 user journeys)
**What it does:** Walks through real user journeys end-to-end.

1. Full page navigation (all 22 pages)
2. Sidebar navigation (click links, verify routing)
3. Theme toggle (light/dark without errors)
4. Listing creation form (all fields present)
5. Mobile responsive (no horizontal scroll at 375px)
6. Data display integrity (no NaN/undefined)
7. Login flow (form fields, submit, error handling)
8. Registration flow (validation, field checks)
9. Settings interaction (controls, data integrity)
10. Search page flow
11. Dashboard data cards
12. Forgot password flow
13. Analytics charts rendering
14. Inventory page data
15. Login form submission (invalid creds → error)
16. Registration form validation (empty submit)
17. Keyboard shortcut support
18. Cross-page data consistency
19. Onboarding page
20. Diagnostics page

### Agent 5: Performance Agent (11 checks)
Core Web Vitals, memory leaks, image optimization, bundle analysis, third-party script audit.

### Agent 6: Security Agent (14 checks)
Auth bypass, reflected XSS, stored XSS, SQL injection, path traversal, CSRF, CORS, session fixation, rate limiting, headers, cookie security, open redirect, info disclosure, data exposure.

### Agent 7: Data Integrity Agent (8 checks)
Cross-endpoint consistency, response shapes, idempotency, referential integrity, error consistency.

### Agent 8: SEO Agent (12 checks)
Title, meta description, OG tags, canonical URL, heading hierarchy, alt text, semantic HTML, viewport, empty links, JSON-LD structured data, robots meta, language attr.

### Agent 9: Regression Agent (3 viewports × 2 themes)
Screenshot baseline diffing at desktop (1280px), mobile (375px), and tablet (768px) in both light and dark modes.

### Agent 10: State Agent (9 checks)
Theme persistence, sidebar state, localStorage, back button, SWR cache, form state, auth redirect.

### Agent 11: Accessibility Agent (11 checks)
Keyboard navigation, focus traps, landmarks, form labels, ARIA, skip links, escape dismiss, color independence, touch targets (WCAG 2.5.8), focus order (WCAG 2.4.3), reduced motion (WCAG 2.3.3).

### Agent 12: Network Agent (6 checks)
API failure degradation, slow network, offline recovery, timeout handling, cache headers, retry behavior.

---

## How to Run

### Prerequisites
```bash
npm install
npx playwright install chromium
```

### Quick Run (recommended for daily use)
```bash
npm run qa
```
Tests 4 key pages with all 12 agents. Takes ~3-5 minutes.

### Full Run (before release)
```bash
npm run qa:full
```
Tests all 28 pages with all 12 agents. Takes ~10-15 minutes.

### Single Agent Runs
```bash
npm run qa:visual      # Visual consistency
npm run qa:logic       # Business logic
npm run qa:api         # API contracts (90+ tests)
npm run qa:flow        # User journeys (20 flows)
npm run qa:perf        # Core Web Vitals + images + memory + 3rd-party
npm run qa:security    # OWASP security (14 checks)
npm run qa:seo         # SEO audit (12 checks)
npm run qa:data        # Data integrity (8 checks)
npm run qa:regression  # Screenshot baselines (3 viewports × 2 themes)
npm run qa:state       # Client state persistence (9 checks)
npm run qa:a11y        # WCAG 2.1/2.2 AA accessibility (11 checks)
npm run qa:network     # Network resilience (6 checks)
```

### Single Page Deep-Dive
```bash
QA_MODE=single QA_ROUTE=/repricing npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit
```

---

## Output Files

After a run, check `docs/gui-audit/`:

| File | What it is | Who reads it |
|------|-----------|-------------|
| `qa-dashboard.md` | Human-readable summary with tables | You |
| `qa-report.json` | Full machine-readable report | CI/automation |
| `bugs.csv` | Spreadsheet for triage | You (import to Sheets) |
| `issues/*.md` | One file per bug, GitHub-issue-ready | You (copy-paste to GitHub) |
| `trend-history.json` | Run-over-run trend tracking | CI/automation |
| `baselines/*.png` | Screenshot baselines for regression | Regression agent |

### Example Bug Report (from issues/)
```markdown
# [CONTRAST] Text "Active" has contrast ratio 2.31:1

**Labels:** `bug`, `visual`, `contrast`, `severity:critical`
**Priority:** P0-critical
**Confidence:** 90%
**Route:** `/`

## Steps to Reproduce
1. Navigate to /
2. Set color scheme to light
3. Locate the element: div > span.badge

## Expected Behavior
No contrast issues

## Actual Behavior
Text "Active" has contrast ratio 2.31:1 (requires 4.5:1 for WCAG AA)

## Suggested Fix
Increase contrast to at least 4.5:1. Darken the text or lighten the background.
```

---

## Adding New Checks

### Adding a visual check
Edit `consistency-checker.ts`, add a new function like `checkMyThing()`,
and add it to the `runConsistencyChecks()` array.

### Adding an API test
Edit `agent-api.ts`, add a new entry to `getTestSuite()`:
```ts
{
  endpoint: "/api/my-endpoint",
  method: "POST",
  body: { bad: "data" },
  expectedStatus: 400,
  validation: "hasError",
  description: "POST /api/my-endpoint rejects invalid data",
}
```

### Adding a user flow
Edit `agent-flow.ts`, add a new entry to `getUserFlows()`:
```ts
{
  name: "My new flow",
  description: "Test the new feature",
  steps: [
    { action: "navigate", target: "/my-page", description: "Go to page" },
    { action: "click", target: "button.submit", description: "Click submit" },
    { action: "assert", value: "url-contains:/success", description: "Redirected" },
  ],
  expectedOutcome: "User completes the flow",
}
```

### Adding a logic check
Edit `agent-logic.ts`, add a new async function and include it in the `checks` array
inside `runLogicAgent()`.

---

## Recommended Workflow (Solo Developer)

Since you're working alone, here's the practical routine:

### Daily (2 min)
```bash
npm run qa
```
Glance at the terminal output. If critical bugs = 0, you're good.

### Weekly (before deploy)
```bash
npm run qa:full
```
Review `docs/gui-audit/qa-dashboard.md`. Fix any critical/major bugs.

### After Major Changes
```bash
npm run qa:full
```
Compare the bug count with the previous run. New bugs = regressions.

### Before Release
1. Run `npm run qa:full`
2. Open `docs/gui-audit/bugs.csv` in Google Sheets
3. Triage: fix criticals, file majors, defer minors
4. Copy-paste from `docs/gui-audit/issues/*.md` to GitHub Issues for tracking

---

## How Many Manual Test Cases?

Based on the current app (28 pages, 43 components, 56 API endpoints):

| Dimension | Count |
|-----------|-------|
| Pages | 28 |
| Viewports (desktop, tablet, mobile) | 3 |
| Color schemes (light, dark) | 2 |
| Page × Viewport × Scheme | **168 combinations** |
| Visual checks per combination | ~9 |
| API test cases | 35 |
| User flow scenarios | 6 (with 50+ steps total) |
| **Total automated checks** | **~1,587** |

To manually verify all of this, a human tester would need:
- ~3 min per page/viewport/scheme combo = **~8.4 hours** for visual
- ~2 min per API test = **~1.2 hours** for API
- ~5 min per flow = **~30 min** for flows
- **Total: ~10 hours of manual testing per cycle**

This system does it in ~10 minutes, every time, with no mistakes.
