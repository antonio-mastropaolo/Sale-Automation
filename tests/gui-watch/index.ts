/**
 * GUI Watch — Record → Analyze → Replay → Report
 *
 * A 3-step pipeline for generating tests from real user sessions:
 *
 *   Step 1: RECORD — watch the user interact with the app
 *     npm run watch              # Start recording session
 *     npm run watch -- my-flow   # Start with a custom name
 *
 *   Step 2: ANALYZE — generate test cases from the recording
 *     npm run watch:analyze <session-id>
 *
 *   Step 3: RUN — execute the generated tests and produce HTML report
 *     npm run watch:run <suite-id>
 *
 *   All-in-one:
 *     npm run watch:all <session-id>   # analyze + run + report
 *
 * Output:
 *   docs/gui-watch/
 *     sessions/        Recording session JSON files
 *     suites/          Generated test suite JSON files
 *     results/         Test results + HTML reports
 *     screenshots/     Failure screenshots
 */

// Re-export everything for programmatic use
export * from "./types";
export { SessionAnalyzer } from "./session-analyzer";
export { TestRunner } from "./test-runner";
export { generateHtmlReport } from "./report-generator";
