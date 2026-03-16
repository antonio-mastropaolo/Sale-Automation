import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  file: string;
  error?: string;
}

interface TestSuite {
  file: string;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    // Run vitest with JSON reporter
    let output: string;
    try {
      output = execSync("npx vitest run --reporter=json 2>/dev/null", {
        cwd: process.cwd(),
        timeout: 60000,
        encoding: "utf8",
        env: { ...process.env, FORCE_COLOR: "0" },
      });
    } catch (err: unknown) {
      // vitest exits with code 1 on test failures but still produces JSON
      const execErr = err as { stdout?: string; stderr?: string };
      output = execErr.stdout || "";
      if (!output) {
        return NextResponse.json({
          error: "Test runner failed",
          detail: execErr.stderr || "No output",
        }, { status: 500 });
      }
    }

    // Parse JSON output
    let jsonData: Record<string, unknown>;
    try {
      // vitest JSON output might have non-JSON prefix/suffix, find the JSON block
      const jsonStart = output.indexOf("{");
      const jsonEnd = output.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in output");
      jsonData = JSON.parse(output.substring(jsonStart, jsonEnd + 1));
    } catch {
      return NextResponse.json({
        error: "Failed to parse test output",
        raw: output.substring(0, 2000),
      }, { status: 500 });
    }

    // Extract test results from vitest JSON format
    const testResults = jsonData.testResults as Array<{
      name: string;
      status: string;
      startTime: number;
      endTime: number;
      assertionResults?: Array<{
        fullName: string;
        status: string;
        duration: number;
        failureMessages?: string[];
      }>;
    }> || [];

    const suites: TestSuite[] = testResults.map((file) => {
      const results: TestResult[] = (file.assertionResults || []).map((t) => ({
        name: t.fullName,
        status: t.status === "passed" ? "pass" : t.status === "failed" ? "fail" : "skip",
        duration: t.duration || 0,
        file: file.name.split("/").pop() || file.name,
        error: t.failureMessages?.join("\n"),
      }));

      return {
        file: file.name.split("/").pop() || file.name,
        tests: results.length,
        passed: results.filter((r) => r.status === "pass").length,
        failed: results.filter((r) => r.status === "fail").length,
        skipped: results.filter((r) => r.status === "skip").length,
        duration: file.endTime - file.startTime,
        results,
      };
    });

    const totalTests = suites.reduce((s, f) => s + f.tests, 0);
    const totalPassed = suites.reduce((s, f) => s + f.passed, 0);
    const totalFailed = suites.reduce((s, f) => s + f.failed, 0);
    const totalSkipped = suites.reduce((s, f) => s + f.skipped, 0);
    const totalDuration = suites.reduce((s, f) => s + f.duration, 0);

    return NextResponse.json({
      summary: {
        suites: suites.length,
        tests: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        duration: totalDuration,
        success: totalFailed === 0,
        ranAt: new Date().toISOString(),
      },
      suites,
    });
  } catch (err) {
    return NextResponse.json({
      error: "Test runner error",
      detail: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}
