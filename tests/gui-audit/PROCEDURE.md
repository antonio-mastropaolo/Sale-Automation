# TrendSmart QA System — Full Procedure

## What This Is

A **multi-agent automated QA system** that replaces manual testing.
Instead of hiring a tester to click through your app and file bugs,
you run one command and get GitHub-issue-ready bug reports.

## Architecture

Four specialized agents run in sequence, each looking for different classes of bugs:

```
┌─────────────────────────────────────────────────┐
│                  QA Runner (qa.spec.ts)          │
│                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│   │  Visual   │  │  Logic   │  │   API    │     │
│   │  Agent    │  │  Agent   │  │  Agent   │     │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│        │              │              │           │
│   ┌────┴─────┐        │              │           │
│   │  Second  │        │              │           │
│   │  Opinion │        │       ┌──────┴─────┐    │
│   └────┬─────┘        │       │   Flow     │    │
│        │              │       │   Agent    │    │
│        ▼              ▼       └──────┬─────┘    │
│   ┌──────────────────────────────────┴────┐     │
│   │         Bug Reporter                   │     │
│   │  (dedup → score → markdown/csv/json)   │     │
│   └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
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

### Agent 2: Logic Agent
**What it does:** Navigates each page like a user and checks the rendered data.

**Checks:**
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

### Agent 3: API Agent
**What it does:** Hits every API endpoint with both valid and invalid data.
Tests the contract like a QA tester using Postman.

**Test areas:**
- Listings CRUD (GET, POST with valid/invalid data)
- Auth (login with wrong creds, register validation)
- Settings (valid update, empty body rejection)
- Repricing (negative price rejection)
- Offers (invalid action rejection)
- Inbox, Scheduler, Export, Templates, Search
- XSS sanitization check
- Health check

**35 test cases** covering happy paths and edge cases.

### Agent 4: Flow Agent
**What it does:** Walks through real user journeys end-to-end.

**Flows tested:**
1. Full page navigation (visit all 14 key pages)
2. Sidebar navigation (click links, verify URL changes)
3. Theme toggle (light → dark without errors)
4. Listing creation form (all fields present)
5. Mobile responsive (no horizontal scroll at 375px)
6. Data display integrity (no NaN/undefined/Invalid Date)

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
Tests 4 key pages (dashboard, create listing, settings, analytics) with all 4 agents.
Takes ~2-3 minutes.

### Full Run (weekly/before release)
```bash
npm run qa:full
```
Tests all 28 pages. Takes ~10-15 minutes.

### Single Agent Runs
```bash
npm run qa:visual    # Only visual checks
npm run qa:api       # Only API tests
npm run qa:flow      # Only user flow tests
npm run qa:logic     # Only logic checks
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
| `*.png` | Full-page screenshots | You (visual reference) |

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
