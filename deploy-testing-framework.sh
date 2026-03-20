#!/bin/bash
#
# Deploy TrendSmart QA + GUI Watch testing framework to another repo.
#
# Usage:
#   1. cd /path/to/trendsmart
#   2. bash /path/to/listblitz/deploy-testing-framework.sh
#
# What it does:
#   - Copies tests/gui-audit/ (12-agent QA system)
#   - Copies tests/gui-watch/ (record-analyze-replay pipeline)
#   - Patches package.json with QA + Watch npm scripts
#   - Patches playwright.config.ts with gui-audit project
#   - Patches .gitignore with test artifact exclusions
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$(pwd)"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TrendSmart QA — Deploy Testing Framework"
echo "═══════════════════════════════════════════════════════════════"
echo "  Source:  ${SCRIPT_DIR}"
echo "  Target:  ${TARGET_DIR}"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Sanity check: make sure we're in a repo with package.json
if [ ! -f "package.json" ]; then
  echo "ERROR: No package.json found in ${TARGET_DIR}"
  echo "       Run this script from your project root."
  exit 1
fi

# ── 1. Copy test directories ──
echo "  [1/5] Copying tests/gui-audit/..."
mkdir -p tests/gui-audit
cp -r "${SCRIPT_DIR}/tests/gui-audit/"* tests/gui-audit/
echo "        $(ls tests/gui-audit/*.ts 2>/dev/null | wc -l) TypeScript files copied"

echo "  [2/5] Copying tests/gui-watch/..."
mkdir -p tests/gui-watch
cp -r "${SCRIPT_DIR}/tests/gui-watch/"* tests/gui-watch/
echo "        $(ls tests/gui-watch/*.ts 2>/dev/null | wc -l) TypeScript files copied"

# ── 2. Patch package.json with scripts ──
echo "  [3/5] Patching package.json scripts..."

# Check if scripts already exist
if grep -q '"qa":' package.json; then
  echo "        QA scripts already present — skipping"
else
  # Use node to safely merge scripts into package.json
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const newScripts = {
      'qa': 'npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:full': 'QA_MODE=full npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:visual': 'QA_AGENT=visual npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:api': 'QA_AGENT=api npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:flow': 'QA_AGENT=flow npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:logic': 'QA_AGENT=logic npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:perf': 'QA_AGENT=performance npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:security': 'QA_AGENT=security npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:seo': 'QA_AGENT=seo npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:data': 'QA_AGENT=data-integrity npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:regression': 'QA_AGENT=regression npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:state': 'QA_AGENT=state npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:baselines': 'QA_UPDATE_BASELINES=true QA_AGENT=regression npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:a11y': 'QA_AGENT=a11y npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'qa:network': 'QA_AGENT=network npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit',
      'watch': 'npx ts-node tests/gui-watch/session-recorder.ts',
      'watch:analyze': 'npx ts-node tests/gui-watch/session-analyzer.ts',
      'watch:run': 'npx ts-node tests/gui-watch/test-runner.ts',
      'watch:all': 'npx ts-node tests/gui-watch/run-all.ts',
    };
    pkg.scripts = { ...pkg.scripts, ...newScripts };
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  echo "        Added 19 QA + 4 Watch scripts"
fi

# ── 3. Create/update playwright.config.ts if needed ──
echo "  [4/5] Checking playwright.config.ts..."

if [ ! -f "playwright.config.ts" ]; then
  echo "        Creating playwright.config.ts..."
  cat > playwright.config.ts << 'PWEOF'
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "gui-audit",
      testDir: "./tests/gui-audit",
      testMatch: "*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      timeout: 900_000,
    },
  ],
  webServer: {
    command: "npm run dev -- -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
PWEOF
  echo "        Created playwright.config.ts"
elif ! grep -q "gui-audit" playwright.config.ts; then
  echo "        playwright.config.ts exists but missing gui-audit project"
  echo "        Please add this project manually:"
  echo ""
  echo '    {'
  echo '      name: "gui-audit",'
  echo '      testDir: "./tests/gui-audit",'
  echo '      testMatch: "*.spec.ts",'
  echo '      use: { ...devices["Desktop Chrome"] },'
  echo '      timeout: 900_000,'
  echo '    },'
  echo ""
else
  echo "        gui-audit project already configured"
fi

# ── 4. Patch .gitignore ──
echo "  [5/5] Patching .gitignore..."

IGNORES=(
  "/docs/gui-audit/"
  "/docs/gui-watch/sessions/"
  "/docs/gui-watch/results/"
  "/docs/gui-watch/screenshots/"
  "/docs/gui-watch/suites/"
  "/test-results/"
  "/playwright-report/"
)

for pattern in "${IGNORES[@]}"; do
  if ! grep -qF "$pattern" .gitignore 2>/dev/null; then
    echo "$pattern" >> .gitignore
    echo "        Added: $pattern"
  fi
done

# ── Done ──
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "    1. npm install @playwright/test ts-node typescript"
echo "    2. npx playwright install chromium"
echo "    3. npm run qa              # Run QA (12 agents)"
echo "    4. npm run watch           # Record a session"
echo ""
echo "  Full docs: tests/gui-audit/PROCEDURE.md"
echo "═══════════════════════════════════════════════════════════════"
echo ""
