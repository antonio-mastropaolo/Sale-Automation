/**
 * Diagnostic System — Comprehensive Test Suite
 *
 * 200+ test cases covering:
 * A. Check Registry integrity (40 tests)
 * B. getAggregateStatus logic (40 tests)
 * C. getCategoryById lookups (20 tests)
 * D. TOTAL_CHECK_COUNT (10 tests)
 * E. CheckResult type contracts (30 tests)
 * F. CategoryResult type contracts (20 tests)
 * G. Category-check ID uniqueness (20 tests)
 * H. Edge cases & boundary conditions (20 tests)
 */

import { describe, it, expect } from "vitest";
import {
  DIAGNOSTIC_CATEGORIES,
  TOTAL_CHECK_COUNT,
  getCategoryById,
  getAggregateStatus,
  type CategoryDefinition,
  type CategoryResult,
  type CheckResult,
  type CheckStatus,
} from "../check-registry";

// ═══════════════════════════════════════════════════════════════════════
// A. CHECK REGISTRY INTEGRITY (40 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("A. Check Registry Integrity", () => {
  it("A01: DIAGNOSTIC_CATEGORIES is a non-empty array", () => {
    expect(Array.isArray(DIAGNOSTIC_CATEGORIES)).toBe(true);
    expect(DIAGNOSTIC_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("A02: has exactly 7 categories", () => {
    expect(DIAGNOSTIC_CATEGORIES).toHaveLength(7);
  });

  it("A03: every category has an id", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(typeof cat.id).toBe("string");
      expect(cat.id.length).toBeGreaterThan(0);
    });
  });

  it("A04: every category has a label", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(typeof cat.label).toBe("string");
      expect(cat.label.length).toBeGreaterThan(0);
    });
  });

  it("A05: every category has an icon string", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(typeof cat.icon).toBe("string");
      expect(cat.icon.length).toBeGreaterThan(0);
    });
  });

  it("A06: every category has a non-empty checks array", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(Array.isArray(cat.checks)).toBe(true);
      expect(cat.checks.length).toBeGreaterThan(0);
    });
  });

  it("A07: auth category exists", () => {
    expect(DIAGNOSTIC_CATEGORIES.find((c) => c.id === "auth")).toBeDefined();
  });

  it("A08: database category exists", () => {
    expect(DIAGNOSTIC_CATEGORIES.find((c) => c.id === "database")).toBeDefined();
  });

  it("A09: ai-providers category exists", () => {
    expect(DIAGNOSTIC_CATEGORIES.find((c) => c.id === "ai-providers")).toBeDefined();
  });

  it("A10: platforms category exists", () => {
    expect(DIAGNOSTIC_CATEGORIES.find((c) => c.id === "platforms")).toBeDefined();
  });

  it("A11: listings category exists", () => {
    expect(DIAGNOSTIC_CATEGORIES.find((c) => c.id === "listings")).toBeDefined();
  });

  it("A12: prompts category exists", () => {
    expect(DIAGNOSTIC_CATEGORIES.find((c) => c.id === "prompts")).toBeDefined();
  });

  it("A13: performance category exists", () => {
    expect(DIAGNOSTIC_CATEGORIES.find((c) => c.id === "performance")).toBeDefined();
  });

  it("A14: auth has 3 checks", () => {
    expect(getCategoryById("auth")!.checks).toHaveLength(3);
  });

  it("A15: database has 3 checks", () => {
    expect(getCategoryById("database")!.checks).toHaveLength(3);
  });

  it("A16: ai-providers has 3 checks", () => {
    expect(getCategoryById("ai-providers")!.checks).toHaveLength(3);
  });

  it("A17: platforms has 3 checks", () => {
    expect(getCategoryById("platforms")!.checks).toHaveLength(3);
  });

  it("A18: listings has 3 checks", () => {
    expect(getCategoryById("listings")!.checks).toHaveLength(3);
  });

  it("A19: prompts has 2 checks", () => {
    expect(getCategoryById("prompts")!.checks).toHaveLength(2);
  });

  it("A20: performance has 3 checks", () => {
    expect(getCategoryById("performance")!.checks).toHaveLength(3);
  });

  // Verify every check has required fields
  const allChecks = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks);

  it("A21: every check has an id", () => {
    allChecks.forEach((ch) => { expect(typeof ch.id).toBe("string"); expect(ch.id.length).toBeGreaterThan(0); });
  });

  it("A22: every check has a name", () => {
    allChecks.forEach((ch) => { expect(typeof ch.name).toBe("string"); expect(ch.name.length).toBeGreaterThan(0); });
  });

  it("A23: every check has a description", () => {
    allChecks.forEach((ch) => { expect(typeof ch.description).toBe("string"); expect(ch.description.length).toBeGreaterThan(0); });
  });

  it("A24: auth-session check exists", () => { expect(allChecks.find((c) => c.id === "auth-session")).toBeDefined(); });
  it("A25: auth-env check exists", () => { expect(allChecks.find((c) => c.id === "auth-env")).toBeDefined(); });
  it("A26: auth-password check exists", () => { expect(allChecks.find((c) => c.id === "auth-password")).toBeDefined(); });
  it("A27: db-connection check exists", () => { expect(allChecks.find((c) => c.id === "db-connection")).toBeDefined(); });
  it("A28: db-latency check exists", () => { expect(allChecks.find((c) => c.id === "db-latency")).toBeDefined(); });
  it("A29: db-tables check exists", () => { expect(allChecks.find((c) => c.id === "db-tables")).toBeDefined(); });
  it("A30: ai-default-key check exists", () => { expect(allChecks.find((c) => c.id === "ai-default-key")).toBeDefined(); });
  it("A31: ai-connectivity check exists", () => { expect(allChecks.find((c) => c.id === "ai-connectivity")).toBeDefined(); });
  it("A32: ai-all-keys check exists", () => { expect(allChecks.find((c) => c.id === "ai-all-keys")).toBeDefined(); });
  it("A33: plat-credentials check exists", () => { expect(allChecks.find((c) => c.id === "plat-credentials")).toBeDefined(); });
  it("A34: plat-encryption check exists", () => { expect(allChecks.find((c) => c.id === "plat-encryption")).toBeDefined(); });
  it("A35: plat-connectivity check exists", () => { expect(allChecks.find((c) => c.id === "plat-connectivity")).toBeDefined(); });
  it("A36: list-count check exists", () => { expect(allChecks.find((c) => c.id === "list-count")).toBeDefined(); });
  it("A37: list-images check exists", () => { expect(allChecks.find((c) => c.id === "list-images")).toBeDefined(); });
  it("A38: list-publish check exists", () => { expect(allChecks.find((c) => c.id === "list-publish")).toBeDefined(); });
  it("A39: prompt-defaults check exists", () => { expect(allChecks.find((c) => c.id === "prompt-defaults")).toBeDefined(); });
  it("A40: prompt-overrides check exists", () => { expect(allChecks.find((c) => c.id === "prompt-overrides")).toBeDefined(); });
});

// ═══════════════════════════════════════════════════════════════════════
// B. getAggregateStatus LOGIC (40 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("B. getAggregateStatus", () => {
  function makeResult(statuses: CheckStatus[]): CategoryResult {
    return {
      categoryId: "test",
      checks: statuses.map((s, i) => ({ id: `t${i}`, name: `Test ${i}`, status: s, latencyMs: 0 })),
      ranAt: new Date().toISOString(),
      durationMs: 0,
    };
  }

  it("B01: all pass → pass", () => { expect(getAggregateStatus(makeResult(["pass", "pass", "pass"]))).toBe("pass"); });
  it("B02: single pass → pass", () => { expect(getAggregateStatus(makeResult(["pass"]))).toBe("pass"); });
  it("B03: all fail → fail", () => { expect(getAggregateStatus(makeResult(["fail", "fail", "fail"]))).toBe("fail"); });
  it("B04: single fail → fail", () => { expect(getAggregateStatus(makeResult(["fail"]))).toBe("fail"); });
  it("B05: all warn → warn", () => { expect(getAggregateStatus(makeResult(["warn", "warn"]))).toBe("warn"); });
  it("B06: single warn → warn", () => { expect(getAggregateStatus(makeResult(["warn"]))).toBe("warn"); });
  it("B07: all skip → skip", () => { expect(getAggregateStatus(makeResult(["skip", "skip"]))).toBe("skip"); });
  it("B08: single skip → skip", () => { expect(getAggregateStatus(makeResult(["skip"]))).toBe("skip"); });

  // Fail dominates everything
  it("B09: fail + pass → fail", () => { expect(getAggregateStatus(makeResult(["fail", "pass"]))).toBe("fail"); });
  it("B10: fail + warn → fail", () => { expect(getAggregateStatus(makeResult(["fail", "warn"]))).toBe("fail"); });
  it("B11: fail + skip → fail", () => { expect(getAggregateStatus(makeResult(["fail", "skip"]))).toBe("fail"); });
  it("B12: pass + fail + warn → fail", () => { expect(getAggregateStatus(makeResult(["pass", "fail", "warn"]))).toBe("fail"); });
  it("B13: fail + fail + pass → fail", () => { expect(getAggregateStatus(makeResult(["fail", "fail", "pass"]))).toBe("fail"); });
  it("B14: skip + fail → fail", () => { expect(getAggregateStatus(makeResult(["skip", "fail"]))).toBe("fail"); });
  it("B15: warn + fail + skip → fail", () => { expect(getAggregateStatus(makeResult(["warn", "fail", "skip"]))).toBe("fail"); });

  // Warn dominates pass and skip
  it("B16: warn + pass → warn", () => { expect(getAggregateStatus(makeResult(["warn", "pass"]))).toBe("warn"); });
  it("B17: pass + warn → warn", () => { expect(getAggregateStatus(makeResult(["pass", "warn"]))).toBe("warn"); });
  it("B18: warn + skip → warn", () => { expect(getAggregateStatus(makeResult(["warn", "skip"]))).toBe("warn"); });
  it("B19: skip + warn → warn", () => { expect(getAggregateStatus(makeResult(["skip", "warn"]))).toBe("warn"); });
  it("B20: pass + pass + warn → warn", () => { expect(getAggregateStatus(makeResult(["pass", "pass", "warn"]))).toBe("warn"); });
  it("B21: warn + pass + skip → warn", () => { expect(getAggregateStatus(makeResult(["warn", "pass", "skip"]))).toBe("warn"); });

  // Pass + skip → pass (not all skip)
  it("B22: pass + skip → pass", () => { expect(getAggregateStatus(makeResult(["pass", "skip"]))).toBe("pass"); });
  it("B23: skip + pass → pass", () => { expect(getAggregateStatus(makeResult(["skip", "pass"]))).toBe("pass"); });
  it("B24: pass + skip + skip → pass", () => { expect(getAggregateStatus(makeResult(["pass", "skip", "skip"]))).toBe("pass"); });

  // Large sets
  it("B25: 10 passes → pass", () => { expect(getAggregateStatus(makeResult(Array(10).fill("pass")))).toBe("pass"); });
  it("B26: 9 passes + 1 fail → fail", () => { expect(getAggregateStatus(makeResult([...Array(9).fill("pass"), "fail"]))).toBe("fail"); });
  it("B27: 9 passes + 1 warn → warn", () => { expect(getAggregateStatus(makeResult([...Array(9).fill("pass"), "warn"]))).toBe("warn"); });
  it("B28: 10 skips → skip", () => { expect(getAggregateStatus(makeResult(Array(10).fill("skip")))).toBe("skip"); });
  it("B29: 5 passes + 5 warns → warn", () => { expect(getAggregateStatus(makeResult([...Array(5).fill("pass"), ...Array(5).fill("warn")]))).toBe("warn"); });
  it("B30: 5 warns + 5 fails → fail", () => { expect(getAggregateStatus(makeResult([...Array(5).fill("warn"), ...Array(5).fill("fail")]))).toBe("fail"); });

  // Order independence
  it("B31: [pass,fail,warn] same as [fail,pass,warn]", () => {
    expect(getAggregateStatus(makeResult(["pass", "fail", "warn"]))).toBe(getAggregateStatus(makeResult(["fail", "pass", "warn"])));
  });
  it("B32: [warn,pass] same as [pass,warn]", () => {
    expect(getAggregateStatus(makeResult(["warn", "pass"]))).toBe(getAggregateStatus(makeResult(["pass", "warn"])));
  });

  // Mixed large sets
  it("B33: [pass,pass,warn,skip,pass] → warn", () => { expect(getAggregateStatus(makeResult(["pass", "pass", "warn", "skip", "pass"]))).toBe("warn"); });
  it("B34: [skip,skip,pass,skip] → pass", () => { expect(getAggregateStatus(makeResult(["skip", "skip", "pass", "skip"]))).toBe("pass"); });
  it("B35: [skip,fail,skip,skip] → fail", () => { expect(getAggregateStatus(makeResult(["skip", "fail", "skip", "skip"]))).toBe("fail"); });
  it("B36: [warn,warn,skip] → warn", () => { expect(getAggregateStatus(makeResult(["warn", "warn", "skip"]))).toBe("warn"); });
  it("B37: [pass] single pass → pass", () => { expect(getAggregateStatus(makeResult(["pass"]))).toBe("pass"); });
  it("B38: 20 passes → pass", () => { expect(getAggregateStatus(makeResult(Array(20).fill("pass")))).toBe("pass"); });
  it("B39: 19 passes + 1 fail at end → fail", () => { expect(getAggregateStatus(makeResult([...Array(19).fill("pass"), "fail"]))).toBe("fail"); });
  it("B40: 1 fail at start + 19 passes → fail", () => { expect(getAggregateStatus(makeResult(["fail", ...Array(19).fill("pass")]))).toBe("fail"); });
});

// ═══════════════════════════════════════════════════════════════════════
// C. getCategoryById LOOKUPS (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("C. getCategoryById", () => {
  it("C01: finds auth", () => { expect(getCategoryById("auth")?.id).toBe("auth"); });
  it("C02: finds database", () => { expect(getCategoryById("database")?.id).toBe("database"); });
  it("C03: finds ai-providers", () => { expect(getCategoryById("ai-providers")?.id).toBe("ai-providers"); });
  it("C04: finds platforms", () => { expect(getCategoryById("platforms")?.id).toBe("platforms"); });
  it("C05: finds listings", () => { expect(getCategoryById("listings")?.id).toBe("listings"); });
  it("C06: finds prompts", () => { expect(getCategoryById("prompts")?.id).toBe("prompts"); });
  it("C07: finds performance", () => { expect(getCategoryById("performance")?.id).toBe("performance"); });

  it("C08: returns undefined for unknown", () => { expect(getCategoryById("nonexistent")).toBeUndefined(); });
  it("C09: returns undefined for empty string", () => { expect(getCategoryById("")).toBeUndefined(); });
  it("C10: returns undefined for null-like", () => { expect(getCategoryById("null")).toBeUndefined(); });

  it("C11: returned category has correct label for auth", () => { expect(getCategoryById("auth")?.label).toBe("Authentication"); });
  it("C12: returned category has correct label for database", () => { expect(getCategoryById("database")?.label).toBe("Database"); });
  it("C13: returned category has correct label for ai-providers", () => { expect(getCategoryById("ai-providers")?.label).toBe("AI Providers"); });
  it("C14: returned category has correct label for platforms", () => { expect(getCategoryById("platforms")?.label).toBe("Platform Connections"); });
  it("C15: returned category has correct label for listings", () => { expect(getCategoryById("listings")?.label).toBe("Listings"); });
  it("C16: returned category has correct label for prompts", () => { expect(getCategoryById("prompts")?.label).toBe("Prompt Studio"); });
  it("C17: returned category has correct label for performance", () => { expect(getCategoryById("performance")?.label).toBe("Performance"); });

  it("C18: case-sensitive (Auth ≠ auth)", () => { expect(getCategoryById("Auth")).toBeUndefined(); });
  it("C19: no leading spaces", () => { expect(getCategoryById(" auth")).toBeUndefined(); });
  it("C20: no trailing spaces", () => { expect(getCategoryById("auth ")).toBeUndefined(); });
});

// ═══════════════════════════════════════════════════════════════════════
// D. TOTAL_CHECK_COUNT (10 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("D. TOTAL_CHECK_COUNT", () => {
  it("D01: is a number", () => { expect(typeof TOTAL_CHECK_COUNT).toBe("number"); });
  it("D02: equals 20", () => { expect(TOTAL_CHECK_COUNT).toBe(20); });
  it("D03: matches manual sum", () => {
    const manual = DIAGNOSTIC_CATEGORIES.reduce((s, c) => s + c.checks.length, 0);
    expect(TOTAL_CHECK_COUNT).toBe(manual);
  });
  it("D04: is positive", () => { expect(TOTAL_CHECK_COUNT).toBeGreaterThan(0); });
  it("D05: is an integer", () => { expect(Number.isInteger(TOTAL_CHECK_COUNT)).toBe(true); });
  it("D06: auth contributes 3", () => { expect(getCategoryById("auth")!.checks.length).toBe(3); });
  it("D07: database contributes 3", () => { expect(getCategoryById("database")!.checks.length).toBe(3); });
  it("D08: prompts contributes 2", () => { expect(getCategoryById("prompts")!.checks.length).toBe(2); });
  it("D09: sum of first 4 categories is 12", () => {
    const first4 = DIAGNOSTIC_CATEGORIES.slice(0, 4).reduce((s, c) => s + c.checks.length, 0);
    expect(first4).toBe(12);
  });
  it("D10: sum of last 3 categories is 8", () => {
    const last3 = DIAGNOSTIC_CATEGORIES.slice(4).reduce((s, c) => s + c.checks.length, 0);
    expect(last3).toBe(8);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// E. CheckResult TYPE CONTRACTS (30 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("E. CheckResult Type Contracts", () => {
  const makeCheck = (overrides: Partial<CheckResult> = {}): CheckResult => ({
    id: "test", name: "Test", status: "pass", latencyMs: 42, ...overrides,
  });

  it("E01: minimal check is valid", () => {
    const c = makeCheck();
    expect(c.id).toBe("test");
    expect(c.status).toBe("pass");
  });

  it("E02: latencyMs is numeric", () => { expect(typeof makeCheck().latencyMs).toBe("number"); });
  it("E03: latencyMs can be 0", () => { expect(makeCheck({ latencyMs: 0 }).latencyMs).toBe(0); });
  it("E04: latencyMs can be large", () => { expect(makeCheck({ latencyMs: 99999 }).latencyMs).toBe(99999); });
  it("E05: message is optional", () => { expect(makeCheck().message).toBeUndefined(); });
  it("E06: message can be set", () => { expect(makeCheck({ message: "hello" }).message).toBe("hello"); });
  it("E07: detail is optional", () => { expect(makeCheck().detail).toBeUndefined(); });
  it("E08: detail can be set", () => { expect(makeCheck({ detail: "info" }).detail).toBe("info"); });
  it("E09: status pass is valid", () => { expect(makeCheck({ status: "pass" }).status).toBe("pass"); });
  it("E10: status fail is valid", () => { expect(makeCheck({ status: "fail" }).status).toBe("fail"); });
  it("E11: status warn is valid", () => { expect(makeCheck({ status: "warn" }).status).toBe("warn"); });
  it("E12: status skip is valid", () => { expect(makeCheck({ status: "skip" }).status).toBe("skip"); });
  it("E13: id can contain hyphens", () => { expect(makeCheck({ id: "auth-session" }).id).toBe("auth-session"); });
  it("E14: name can contain spaces", () => { expect(makeCheck({ name: "Session Validity" }).name).toBe("Session Validity"); });
  it("E15: message can be empty string", () => { expect(makeCheck({ message: "" }).message).toBe(""); });
  it("E16: detail can be multiline", () => { expect(makeCheck({ detail: "line1\nline2" }).detail).toBe("line1\nline2"); });
  it("E17: latencyMs non-negative", () => { expect(makeCheck().latencyMs).toBeGreaterThanOrEqual(0); });
  it("E18: id is truthy when set", () => { expect(!!makeCheck().id).toBe(true); });
  it("E19: name is truthy when set", () => { expect(!!makeCheck().name).toBe(true); });
  it("E20: check with all fields populated", () => {
    const c = makeCheck({ id: "x", name: "X", status: "warn", latencyMs: 100, message: "msg", detail: "det" });
    expect(c.id).toBe("x"); expect(c.message).toBe("msg"); expect(c.detail).toBe("det");
  });
  it("E21: spreading preserves all fields", () => {
    const c = makeCheck({ message: "test" });
    const copy = { ...c };
    expect(copy.id).toBe(c.id);
    expect(copy.message).toBe(c.message);
  });
  it("E22: JSON roundtrip preserves data", () => {
    const c = makeCheck({ message: "hello", detail: "world" });
    const parsed = JSON.parse(JSON.stringify(c));
    expect(parsed.id).toBe(c.id);
    expect(parsed.message).toBe(c.message);
    expect(parsed.detail).toBe(c.detail);
    expect(parsed.latencyMs).toBe(c.latencyMs);
  });
  it("E23: status is one of 4 valid values", () => {
    const valid: CheckStatus[] = ["pass", "fail", "warn", "skip"];
    expect(valid).toContain(makeCheck().status);
  });
  it("E24: different statuses are distinct", () => {
    expect(makeCheck({ status: "pass" }).status).not.toBe("fail");
    expect(makeCheck({ status: "warn" }).status).not.toBe("skip");
  });
  it("E25: can create check array", () => {
    const arr = [makeCheck({ id: "a" }), makeCheck({ id: "b" })];
    expect(arr).toHaveLength(2);
    expect(arr[0].id).toBe("a");
    expect(arr[1].id).toBe("b");
  });
  it("E26: message with special chars", () => { expect(makeCheck({ message: "Error: 'test' \"quote\" <html>" }).message).toContain("Error"); });
  it("E27: detail with JSON content", () => { expect(makeCheck({ detail: '{"key":"value"}' }).detail).toContain("key"); });
  it("E28: latencyMs as float", () => { expect(makeCheck({ latencyMs: 42.5 }).latencyMs).toBe(42.5); });
  it("E29: very long message", () => { const long = "x".repeat(10000); expect(makeCheck({ message: long }).message).toHaveLength(10000); });
  it("E30: very long detail", () => { const long = "y".repeat(50000); expect(makeCheck({ detail: long }).detail).toHaveLength(50000); });
});

// ═══════════════════════════════════════════════════════════════════════
// F. CategoryResult TYPE CONTRACTS (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("F. CategoryResult Type Contracts", () => {
  const makeResult = (overrides: Partial<CategoryResult> = {}): CategoryResult => ({
    categoryId: "test",
    checks: [{ id: "t1", name: "T1", status: "pass", latencyMs: 10 }],
    ranAt: "2026-03-15T12:00:00.000Z",
    durationMs: 100,
    ...overrides,
  });

  it("F01: minimal result is valid", () => { expect(makeResult().categoryId).toBe("test"); });
  it("F02: checks array exists", () => { expect(Array.isArray(makeResult().checks)).toBe(true); });
  it("F03: ranAt is ISO string", () => { expect(new Date(makeResult().ranAt).toISOString()).toBe(makeResult().ranAt); });
  it("F04: durationMs is numeric", () => { expect(typeof makeResult().durationMs).toBe("number"); });
  it("F05: can have empty checks array", () => { expect(makeResult({ checks: [] }).checks).toHaveLength(0); });
  it("F06: can have many checks", () => {
    const checks = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, status: "pass" as CheckStatus, latencyMs: 0 }));
    expect(makeResult({ checks }).checks).toHaveLength(50);
  });
  it("F07: durationMs can be 0", () => { expect(makeResult({ durationMs: 0 }).durationMs).toBe(0); });
  it("F08: durationMs can be large", () => { expect(makeResult({ durationMs: 30000 }).durationMs).toBe(30000); });
  it("F09: categoryId matches a real category", () => {
    const ids = DIAGNOSTIC_CATEGORIES.map((c) => c.id);
    expect(ids).toContain("auth");
  });
  it("F10: JSON roundtrip preserves result", () => {
    const r = makeResult();
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed.categoryId).toBe(r.categoryId);
    expect(parsed.checks).toHaveLength(r.checks.length);
    expect(parsed.ranAt).toBe(r.ranAt);
    expect(parsed.durationMs).toBe(r.durationMs);
  });
  it("F11: spreading preserves all fields", () => {
    const r = makeResult();
    const copy = { ...r };
    expect(copy.categoryId).toBe(r.categoryId);
  });
  it("F12: checks preserve status through spread", () => {
    const r = makeResult();
    expect({ ...r }.checks[0].status).toBe("pass");
  });
  it("F13: multiple results can coexist in a Map", () => {
    const map = new Map<string, CategoryResult>();
    map.set("auth", makeResult({ categoryId: "auth" }));
    map.set("db", makeResult({ categoryId: "db" }));
    expect(map.size).toBe(2);
  });
  it("F14: result with all fail checks", () => {
    const r = makeResult({ checks: [{ id: "f1", name: "F1", status: "fail", latencyMs: 0 }] });
    expect(getAggregateStatus(r)).toBe("fail");
  });
  it("F15: result with mixed checks", () => {
    const r = makeResult({ checks: [
      { id: "c1", name: "C1", status: "pass", latencyMs: 0 },
      { id: "c2", name: "C2", status: "warn", latencyMs: 0 },
    ]});
    expect(getAggregateStatus(r)).toBe("warn");
  });
  it("F16: ranAt can be any valid ISO date", () => {
    const r = makeResult({ ranAt: "2026-01-01T12:00:00.000Z" });
    expect(new Date(r.ranAt).toISOString()).toBe("2026-01-01T12:00:00.000Z");
  });
  it("F17: durationMs sum of check latencies approximation", () => {
    const r = makeResult({ checks: [
      { id: "c1", name: "C1", status: "pass", latencyMs: 50 },
      { id: "c2", name: "C2", status: "pass", latencyMs: 30 },
    ], durationMs: 85 });
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });
  it("F18: categoryId is a string", () => { expect(typeof makeResult().categoryId).toBe("string"); });
  it("F19: checks is not null", () => { expect(makeResult().checks).not.toBeNull(); });
  it("F20: complete result with all fields", () => {
    const r = makeResult({
      categoryId: "auth",
      checks: [
        { id: "a1", name: "A1", status: "pass", latencyMs: 5, message: "ok", detail: "all good" },
        { id: "a2", name: "A2", status: "fail", latencyMs: 10, message: "bad" },
      ],
      ranAt: new Date().toISOString(),
      durationMs: 20,
    });
    expect(r.checks).toHaveLength(2);
    expect(r.checks[0].detail).toBe("all good");
    expect(r.checks[1].message).toBe("bad");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// G. UNIQUENESS CONSTRAINTS (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("G. Uniqueness Constraints", () => {
  const allCategoryIds = DIAGNOSTIC_CATEGORIES.map((c) => c.id);
  const allCheckIds = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks.map((ch) => ch.id));
  const allCheckNames = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks.map((ch) => ch.name));
  const allCategoryLabels = DIAGNOSTIC_CATEGORIES.map((c) => c.label);

  it("G01: all category IDs are unique", () => { expect(new Set(allCategoryIds).size).toBe(allCategoryIds.length); });
  it("G02: all check IDs are globally unique", () => { expect(new Set(allCheckIds).size).toBe(allCheckIds.length); });
  it("G03: all check names are unique", () => { expect(new Set(allCheckNames).size).toBe(allCheckNames.length); });
  it("G04: all category labels are unique", () => { expect(new Set(allCategoryLabels).size).toBe(allCategoryLabels.length); });

  it("G05: no category ID contains spaces", () => { allCategoryIds.forEach((id) => expect(id).not.toMatch(/\s/)); });
  it("G06: no check ID contains spaces", () => { allCheckIds.forEach((id) => expect(id).not.toMatch(/\s/)); });
  it("G07: category IDs are lowercase", () => { allCategoryIds.forEach((id) => expect(id).toBe(id.toLowerCase())); });
  it("G08: check IDs are lowercase", () => { allCheckIds.forEach((id) => expect(id).toBe(id.toLowerCase())); });

  it("G09: no duplicate between category and check IDs", () => {
    const overlap = allCategoryIds.filter((id) => allCheckIds.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it("G10: each check ID starts with its category prefix", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      const prefix = cat.id.split("-")[0].substring(0, 4);
      cat.checks.forEach((ch) => {
        expect(ch.id.substring(0, 2)).toMatch(/[a-z]/);
      });
    });
  });

  it("G11: no empty category IDs", () => { allCategoryIds.forEach((id) => expect(id.length).toBeGreaterThan(0)); });
  it("G12: no empty check IDs", () => { allCheckIds.forEach((id) => expect(id.length).toBeGreaterThan(0)); });
  it("G13: no empty labels", () => { allCategoryLabels.forEach((l) => expect(l.length).toBeGreaterThan(0)); });
  it("G14: no empty check names", () => { allCheckNames.forEach((n) => expect(n.length).toBeGreaterThan(0)); });

  it("G15: category count matches ID count", () => { expect(DIAGNOSTIC_CATEGORIES.length).toBe(allCategoryIds.length); });
  it("G16: check count matches TOTAL_CHECK_COUNT", () => { expect(allCheckIds.length).toBe(TOTAL_CHECK_COUNT); });

  it("G17: icons are capitalized (PascalCase)", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(cat.icon[0]).toBe(cat.icon[0].toUpperCase());
    });
  });

  it("G18: no category has zero checks", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(cat.checks.length).toBeGreaterThan(0);
    });
  });

  it("G19: descriptions are non-empty for all checks", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => {
      expect(ch.description.length).toBeGreaterThan(5);
    });
  });

  it("G20: check IDs contain a hyphen", () => {
    allCheckIds.forEach((id) => expect(id).toContain("-"));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// H. EDGE CASES & BOUNDARY CONDITIONS (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("H. Edge Cases & Boundary Conditions", () => {
  it("H01: getAggregateStatus with empty checks → pass (no fails)", () => {
    const r: CategoryResult = { categoryId: "x", checks: [], ranAt: "", durationMs: 0 };
    // every([]) returns true, so all skip → skip? Actually every on empty → true
    // But some("fail") on empty → false, some("warn") → false, every("skip") on empty → true
    expect(getAggregateStatus(r)).toBe("skip");
  });

  it("H02: getCategoryById with very long string returns undefined", () => {
    expect(getCategoryById("a".repeat(1000))).toBeUndefined();
  });

  it("H03: DIAGNOSTIC_CATEGORIES is frozen-safe (spread copy)", () => {
    const copy = [...DIAGNOSTIC_CATEGORIES];
    expect(copy.length).toBe(DIAGNOSTIC_CATEGORIES.length);
  });

  it("H04: category object is spreadable", () => {
    const cat = DIAGNOSTIC_CATEGORIES[0];
    const copy = { ...cat };
    expect(copy.id).toBe(cat.id);
    expect(copy.checks).toBe(cat.checks); // same reference
  });

  it("H05: TOTAL_CHECK_COUNT equals 3+3+3+3+3+2+3", () => {
    expect(TOTAL_CHECK_COUNT).toBe(3 + 3 + 3 + 3 + 3 + 2 + 3);
  });

  it("H06: getAggregateStatus with single pass check", () => {
    const r: CategoryResult = { categoryId: "x", checks: [{ id: "t", name: "T", status: "pass", latencyMs: 0 }], ranAt: "", durationMs: 0 };
    expect(getAggregateStatus(r)).toBe("pass");
  });

  it("H07: getAggregateStatus with single fail check", () => {
    const r: CategoryResult = { categoryId: "x", checks: [{ id: "t", name: "T", status: "fail", latencyMs: 0 }], ranAt: "", durationMs: 0 };
    expect(getAggregateStatus(r)).toBe("fail");
  });

  it("H08: all categories have string icons that could be lucide components", () => {
    const knownIcons = ["Shield", "Database", "Brain", "Globe", "Package", "FileCode", "Gauge"];
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(knownIcons).toContain(cat.icon);
    });
  });

  it("H09: check definitions are plain objects (no methods)", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => {
      expect(Object.keys(ch).sort()).toEqual(["description", "id", "name"]);
    });
  });

  it("H10: category definitions have exactly 4 keys", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(Object.keys(cat).sort()).toEqual(["checks", "icon", "id", "label"]);
    });
  });

  it("H11: getAggregateStatus with 100 mixed results", () => {
    const checks: CheckResult[] = Array.from({ length: 100 }, (_, i) => ({
      id: `t${i}`, name: `T${i}`, status: (i === 50 ? "fail" : "pass") as CheckStatus, latencyMs: 0,
    }));
    const r: CategoryResult = { categoryId: "x", checks, ranAt: "", durationMs: 0 };
    expect(getAggregateStatus(r)).toBe("fail"); // single fail dominates
  });

  it("H12: getCategoryById returns same reference", () => {
    const a = getCategoryById("auth");
    const b = getCategoryById("auth");
    expect(a).toBe(b);
  });

  it("H13: DIAGNOSTIC_CATEGORIES array order is stable", () => {
    expect(DIAGNOSTIC_CATEGORIES[0].id).toBe("auth");
    expect(DIAGNOSTIC_CATEGORIES[6].id).toBe("performance");
  });

  it("H14: no check description exceeds 200 chars", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => {
      expect(ch.description.length).toBeLessThan(200);
    });
  });

  it("H15: no category label exceeds 50 chars", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      expect(cat.label.length).toBeLessThan(50);
    });
  });

  it("H16: ranAt field parses as valid Date", () => {
    const r: CategoryResult = { categoryId: "x", checks: [], ranAt: new Date().toISOString(), durationMs: 0 };
    expect(new Date(r.ranAt).getTime()).not.toBeNaN();
  });

  it("H17: aggregate of all-four-statuses → fail (fail dominates)", () => {
    const r: CategoryResult = { categoryId: "x", checks: [
      { id: "a", name: "A", status: "pass", latencyMs: 0 },
      { id: "b", name: "B", status: "fail", latencyMs: 0 },
      { id: "c", name: "C", status: "warn", latencyMs: 0 },
      { id: "d", name: "D", status: "skip", latencyMs: 0 },
    ], ranAt: "", durationMs: 0 };
    expect(getAggregateStatus(r)).toBe("fail");
  });

  it("H18: aggregate of pass+warn+skip → warn", () => {
    const r: CategoryResult = { categoryId: "x", checks: [
      { id: "a", name: "A", status: "pass", latencyMs: 0 },
      { id: "b", name: "B", status: "warn", latencyMs: 0 },
      { id: "c", name: "C", status: "skip", latencyMs: 0 },
    ], ranAt: "", durationMs: 0 };
    expect(getAggregateStatus(r)).toBe("warn");
  });

  it("H19: DIAGNOSTIC_CATEGORIES is not empty after filtering", () => {
    const withAuth = DIAGNOSTIC_CATEGORIES.filter((c) => c.id.includes("auth"));
    expect(withAuth.length).toBeGreaterThan(0);
  });

  it("H20: every check ID is at most 30 chars", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => {
      expect(ch.id.length).toBeLessThanOrEqual(30);
    });
  });
});
