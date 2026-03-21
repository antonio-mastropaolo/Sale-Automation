/* ------------------------------------------------------------------ */
/*  Visual Test Fixture                                                 */
/*                                                                      */
/*  Extends Playwright's `test` to provide a `vh` (VisualHarness)       */
/*  fixture.  Import this instead of @playwright/test in any spec       */
/*  file to get automatic visual indicators during test execution.      */
/*                                                                      */
/*  Usage:                                                              */
/*    import { test, expect } from '../recorder/visual-fixture';        */
/*    test('my test', async ({ vh, page }) => {                         */
/*      await vh.goto('/dashboard');                                    */
/*      await vh.click('button:has-text("Save")');                     */
/*      await vh.fill('input[name="email"]', 'test@example.com');      */
/*    });                                                               */
/* ------------------------------------------------------------------ */

import { test as base, expect } from "@playwright/test";
import { VisualHarness } from "./visual-harness";

type VisualFixtures = {
  vh: VisualHarness;
};

export const test = base.extend<VisualFixtures>({
  vh: async ({ page }, use) => {
    const speed = parseFloat(process.env.SPEED || "1") || 1;
    const actionDelay = Math.max(80, 250 / speed);

    const harness = new VisualHarness(page, { actionDelay });
    await harness.inject();
    await use(harness);
  },
});

export { expect };
