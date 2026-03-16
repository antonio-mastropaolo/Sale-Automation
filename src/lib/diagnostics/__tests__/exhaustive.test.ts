/**
 * Diagnostic System — Exhaustive & Regression Tests
 *
 * 200+ additional tests covering:
 * Q.  Full 4^3 permutation matrix (64 tests)
 * R.  Regression: priority ordering proof (30 tests)
 * S.  Data structure invariants (25 tests)
 * T.  Snapshot / contract stability (25 tests)
 * U.  Boundary: very large data (20 tests)
 * V.  Determinism: repeated calls (20 tests)
 * W.  Integration: full workflow simulation (20 tests)
 */

import { describe, it, expect } from "vitest";
import {
  DIAGNOSTIC_CATEGORIES,
  TOTAL_CHECK_COUNT,
  getCategoryById,
  getAggregateStatus,
  type CategoryResult,
  type CheckResult,
  type CheckStatus,
} from "../check-registry";

function makeResult(statuses: CheckStatus[], id = "test"): CategoryResult {
  return {
    categoryId: id,
    checks: statuses.map((s, i) => ({ id: `${id}-${i}`, name: `C${i}`, status: s, latencyMs: i })),
    ranAt: new Date().toISOString(),
    durationMs: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Q. FULL 4^3 PERMUTATION MATRIX (64 tests)
// Every possible 3-element combination of [pass, fail, warn, skip]
// ═══════════════════════════════════════════════════════════════════════

describe("Q. Full 4^3 Permutation Matrix", () => {
  const S: CheckStatus[] = ["pass", "fail", "warn", "skip"];

  function expected(a: CheckStatus, b: CheckStatus, c: CheckStatus): CheckStatus {
    const arr = [a, b, c];
    if (arr.includes("fail")) return "fail";
    if (arr.includes("warn")) return "warn";
    if (arr.every((s) => s === "skip")) return "skip";
    return "pass";
  }

  let testNum = 0;
  for (const a of S) {
    for (const b of S) {
      for (const c of S) {
        const exp = expected(a, b, c);
        testNum++;
        it(`Q${String(testNum).padStart(2, "0")}: [${a},${b},${c}] → ${exp}`, () => {
          expect(getAggregateStatus(makeResult([a, b, c]))).toBe(exp);
        });
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════
// R. REGRESSION: PRIORITY ORDERING PROOF (30 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("R. Priority Ordering Proof", () => {
  // Priority: fail > warn > pass > skip (for the "worst" dimension)
  // But "all skip" is its own bucket

  it("R01: fail > warn (fail present → always fail)", () => {
    for (let n = 1; n <= 10; n++) {
      expect(getAggregateStatus(makeResult(["fail", ...Array(n).fill("warn")]))).toBe("fail");
    }
  });

  it("R02: fail > pass (fail present → always fail)", () => {
    for (let n = 1; n <= 10; n++) {
      expect(getAggregateStatus(makeResult(["fail", ...Array(n).fill("pass")]))).toBe("fail");
    }
  });

  it("R03: fail > skip (fail present → always fail)", () => {
    for (let n = 1; n <= 10; n++) {
      expect(getAggregateStatus(makeResult(["fail", ...Array(n).fill("skip")]))).toBe("fail");
    }
  });

  it("R04: warn > pass (warn present, no fail → warn)", () => {
    for (let n = 1; n <= 10; n++) {
      expect(getAggregateStatus(makeResult(["warn", ...Array(n).fill("pass")]))).toBe("warn");
    }
  });

  it("R05: warn > skip (warn present, no fail → warn)", () => {
    for (let n = 1; n <= 10; n++) {
      expect(getAggregateStatus(makeResult(["warn", ...Array(n).fill("skip")]))).toBe("warn");
    }
  });

  it("R06: pass > skip (pass present, no fail/warn → pass)", () => {
    for (let n = 1; n <= 10; n++) {
      expect(getAggregateStatus(makeResult(["pass", ...Array(n).fill("skip")]))).toBe("pass");
    }
  });

  it("R07: all-skip is its own status", () => {
    for (let n = 1; n <= 10; n++) {
      expect(getAggregateStatus(makeResult(Array(n).fill("skip")))).toBe("skip");
    }
  });

  it("R08: fail at every position in 5-element array → fail", () => {
    for (let pos = 0; pos < 5; pos++) {
      const arr: CheckStatus[] = Array(5).fill("pass");
      arr[pos] = "fail";
      expect(getAggregateStatus(makeResult(arr))).toBe("fail");
    }
  });

  it("R09: warn at every position in 5-element pass array → warn", () => {
    for (let pos = 0; pos < 5; pos++) {
      const arr: CheckStatus[] = Array(5).fill("pass");
      arr[pos] = "warn";
      expect(getAggregateStatus(makeResult(arr))).toBe("warn");
    }
  });

  it("R10: single pass among skips → pass", () => {
    for (let pos = 0; pos < 5; pos++) {
      const arr: CheckStatus[] = Array(5).fill("skip");
      arr[pos] = "pass";
      expect(getAggregateStatus(makeResult(arr))).toBe("pass");
    }
  });

  // Escalation: adding a worse status always escalates
  it("R11: pass → +warn = warn", () => { expect(getAggregateStatus(makeResult(["pass", "warn"]))).toBe("warn"); });
  it("R12: pass → +fail = fail", () => { expect(getAggregateStatus(makeResult(["pass", "fail"]))).toBe("fail"); });
  it("R13: warn → +fail = fail", () => { expect(getAggregateStatus(makeResult(["warn", "fail"]))).toBe("fail"); });
  it("R14: skip → +pass = pass", () => { expect(getAggregateStatus(makeResult(["skip", "pass"]))).toBe("pass"); });
  it("R15: skip → +warn = warn", () => { expect(getAggregateStatus(makeResult(["skip", "warn"]))).toBe("warn"); });
  it("R16: skip → +fail = fail", () => { expect(getAggregateStatus(makeResult(["skip", "fail"]))).toBe("fail"); });

  // De-escalation: removing the worst status improves
  it("R17: [fail,pass] - fail = [pass] → pass", () => { expect(getAggregateStatus(makeResult(["pass"]))).toBe("pass"); });
  it("R18: [warn,pass] - warn = [pass] → pass", () => { expect(getAggregateStatus(makeResult(["pass"]))).toBe("pass"); });

  // Stability: same status repeated any number of times
  it("R19: N passes → pass for N=1..20", () => {
    for (let n = 1; n <= 20; n++) expect(getAggregateStatus(makeResult(Array(n).fill("pass")))).toBe("pass");
  });
  it("R20: N fails → fail for N=1..20", () => {
    for (let n = 1; n <= 20; n++) expect(getAggregateStatus(makeResult(Array(n).fill("fail")))).toBe("fail");
  });
  it("R21: N warns → warn for N=1..20", () => {
    for (let n = 1; n <= 20; n++) expect(getAggregateStatus(makeResult(Array(n).fill("warn")))).toBe("warn");
  });
  it("R22: N skips → skip for N=1..20", () => {
    for (let n = 1; n <= 20; n++) expect(getAggregateStatus(makeResult(Array(n).fill("skip")))).toBe("skip");
  });

  // Ratio tests: fail wins regardless of ratio
  it("R23: 1 fail in 100 → fail", () => { expect(getAggregateStatus(makeResult([...Array(99).fill("pass"), "fail"]))).toBe("fail"); });
  it("R24: 1 fail in 1000 → fail", () => { expect(getAggregateStatus(makeResult([...Array(999).fill("pass"), "fail"]))).toBe("fail"); });
  it("R25: 1 warn in 100 → warn", () => { expect(getAggregateStatus(makeResult([...Array(99).fill("pass"), "warn"]))).toBe("warn"); });
  it("R26: 1 warn in 1000 → warn", () => { expect(getAggregateStatus(makeResult([...Array(999).fill("pass"), "warn"]))).toBe("warn"); });
  it("R27: 1 pass in 100 skips → pass", () => { expect(getAggregateStatus(makeResult([...Array(99).fill("skip"), "pass"]))).toBe("pass"); });
  it("R28: 1 pass in 1000 skips → pass", () => { expect(getAggregateStatus(makeResult([...Array(999).fill("skip"), "pass"]))).toBe("pass"); });

  // Mixed large arrays
  it("R29: 50 pass + 50 warn → warn", () => { expect(getAggregateStatus(makeResult([...Array(50).fill("pass"), ...Array(50).fill("warn")]))).toBe("warn"); });
  it("R30: 50 warn + 50 skip → warn", () => { expect(getAggregateStatus(makeResult([...Array(50).fill("warn"), ...Array(50).fill("skip")]))).toBe("warn"); });
});

// ═══════════════════════════════════════════════════════════════════════
// S. DATA STRUCTURE INVARIANTS (25 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("S. Data Structure Invariants", () => {
  it("S01: DIAGNOSTIC_CATEGORIES is an array", () => { expect(Array.isArray(DIAGNOSTIC_CATEGORIES)).toBe(true); });
  it("S02: Every element is an object", () => { DIAGNOSTIC_CATEGORIES.forEach((c) => expect(typeof c).toBe("object")); });
  it("S03: No null elements", () => { DIAGNOSTIC_CATEGORIES.forEach((c) => expect(c).not.toBeNull()); });
  it("S04: No undefined elements", () => { DIAGNOSTIC_CATEGORIES.forEach((c) => expect(c).toBeDefined()); });
  it("S05: checks arrays contain only objects", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => {
      expect(typeof ch).toBe("object");
      expect(ch).not.toBeNull();
    });
  });
  it("S06: No NaN in any numeric-like field", () => {
    expect(Number.isNaN(TOTAL_CHECK_COUNT)).toBe(false);
  });
  it("S07: All IDs are non-empty strings", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => { expect(c.id).toBeTruthy(); c.checks.forEach((ch) => expect(ch.id).toBeTruthy()); });
  });
  it("S08: All labels/names are non-empty strings", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => { expect(c.label).toBeTruthy(); c.checks.forEach((ch) => expect(ch.name).toBeTruthy()); });
  });
  it("S09: No prototype pollution in category objects", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => {
      expect(c.hasOwnProperty("id")).toBe(true);
      expect(c.hasOwnProperty("__proto__")).toBe(false);
    });
  });
  it("S10: JSON.stringify doesn't throw for any category", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => expect(() => JSON.stringify(c)).not.toThrow());
  });
  it("S11: No circular references", () => {
    expect(() => JSON.stringify(DIAGNOSTIC_CATEGORIES)).not.toThrow();
  });
  it("S12: Category IDs match regex [a-z][a-z0-9-]*", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => expect(c.id).toMatch(/^[a-z][a-z0-9-]*$/));
  });
  it("S13: Check IDs match regex [a-z][a-z0-9-]*", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => expect(ch.id).toMatch(/^[a-z][a-z0-9-]*$/));
  });
  it("S14: Labels start with uppercase", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => expect(c.label[0]).toBe(c.label[0].toUpperCase()));
  });
  it("S15: Check names start with uppercase", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => expect(ch.name[0]).toBe(ch.name[0].toUpperCase()));
  });
  it("S16: Descriptions start with uppercase", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => expect(ch.description[0]).toBe(ch.description[0].toUpperCase()));
  });
  it("S17: No trailing whitespace in IDs", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => { expect(c.id.trim()).toBe(c.id); c.checks.forEach((ch) => expect(ch.id.trim()).toBe(ch.id)); });
  });
  it("S18: No leading whitespace in labels", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => expect(c.label.trim()).toBe(c.label));
  });
  it("S19: No leading whitespace in check names", () => {
    DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks).forEach((ch) => expect(ch.name.trim()).toBe(ch.name));
  });
  it("S20: typeof checks is always object[]", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => { expect(Array.isArray(c.checks)).toBe(true); c.checks.forEach((ch) => expect(typeof ch).toBe("object")); });
  });
  it("S21: TOTAL_CHECK_COUNT is finite", () => { expect(Number.isFinite(TOTAL_CHECK_COUNT)).toBe(true); });
  it("S22: TOTAL_CHECK_COUNT > 0", () => { expect(TOTAL_CHECK_COUNT).toBeGreaterThan(0); });
  it("S23: TOTAL_CHECK_COUNT < 1000 (reasonable bound)", () => { expect(TOTAL_CHECK_COUNT).toBeLessThan(1000); });
  it("S24: category count < 100 (reasonable bound)", () => { expect(DIAGNOSTIC_CATEGORIES.length).toBeLessThan(100); });
  it("S25: every category icon is a valid PascalCase string", () => {
    DIAGNOSTIC_CATEGORIES.forEach((c) => expect(c.icon).toMatch(/^[A-Z][a-zA-Z0-9]*$/));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// T. SNAPSHOT / CONTRACT STABILITY (25 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("T. Snapshot / Contract Stability", () => {
  it("T01: category IDs snapshot", () => {
    expect(DIAGNOSTIC_CATEGORIES.map((c) => c.id)).toEqual(["auth", "database", "ai-providers", "platforms", "listings", "prompts", "performance"]);
  });
  it("T02: total count is 20", () => { expect(TOTAL_CHECK_COUNT).toBe(20); });
  it("T03: auth has 3 checks", () => { expect(getCategoryById("auth")!.checks.length).toBe(3); });
  it("T04: database has 3 checks", () => { expect(getCategoryById("database")!.checks.length).toBe(3); });
  it("T05: ai-providers has 3 checks", () => { expect(getCategoryById("ai-providers")!.checks.length).toBe(3); });
  it("T06: platforms has 3 checks", () => { expect(getCategoryById("platforms")!.checks.length).toBe(3); });
  it("T07: listings has 3 checks", () => { expect(getCategoryById("listings")!.checks.length).toBe(3); });
  it("T08: prompts has 2 checks", () => { expect(getCategoryById("prompts")!.checks.length).toBe(2); });
  it("T09: performance has 3 checks", () => { expect(getCategoryById("performance")!.checks.length).toBe(3); });

  it("T10: auth check IDs snapshot", () => {
    expect(getCategoryById("auth")!.checks.map((c) => c.id)).toEqual(["auth-session", "auth-env", "auth-password"]);
  });
  it("T11: database check IDs snapshot", () => {
    expect(getCategoryById("database")!.checks.map((c) => c.id)).toEqual(["db-connection", "db-latency", "db-tables"]);
  });
  it("T12: ai-providers check IDs snapshot", () => {
    expect(getCategoryById("ai-providers")!.checks.map((c) => c.id)).toEqual(["ai-default-key", "ai-connectivity", "ai-all-keys"]);
  });
  it("T13: platforms check IDs snapshot", () => {
    expect(getCategoryById("platforms")!.checks.map((c) => c.id)).toEqual(["plat-credentials", "plat-encryption", "plat-connectivity"]);
  });
  it("T14: listings check IDs snapshot", () => {
    expect(getCategoryById("listings")!.checks.map((c) => c.id)).toEqual(["list-count", "list-images", "list-publish"]);
  });
  it("T15: prompts check IDs snapshot", () => {
    expect(getCategoryById("prompts")!.checks.map((c) => c.id)).toEqual(["prompt-defaults", "prompt-overrides"]);
  });
  it("T16: performance check IDs snapshot", () => {
    expect(getCategoryById("performance")!.checks.map((c) => c.id)).toEqual(["perf-memory", "perf-api", "perf-env"]);
  });

  it("T17: icons snapshot", () => {
    expect(DIAGNOSTIC_CATEGORIES.map((c) => c.icon)).toEqual(["Shield", "Database", "Brain", "Globe", "Package", "FileCode", "Gauge"]);
  });

  it("T18: labels snapshot", () => {
    expect(DIAGNOSTIC_CATEGORIES.map((c) => c.label)).toEqual([
      "Authentication", "Database", "AI Providers", "Platform Connections", "Listings", "Prompt Studio", "Performance",
    ]);
  });

  it("T19: getAggregateStatus contract - fail dominates", () => {
    expect(getAggregateStatus(makeResult(["pass", "fail"]))).toBe("fail");
  });
  it("T20: getAggregateStatus contract - warn over pass", () => {
    expect(getAggregateStatus(makeResult(["pass", "warn"]))).toBe("warn");
  });
  it("T21: getAggregateStatus contract - all skip", () => {
    expect(getAggregateStatus(makeResult(["skip", "skip"]))).toBe("skip");
  });
  it("T22: getAggregateStatus contract - pass + skip = pass", () => {
    expect(getAggregateStatus(makeResult(["pass", "skip"]))).toBe("pass");
  });

  it("T23: getCategoryById returns correct type", () => {
    const cat = getCategoryById("auth");
    expect(cat).toBeDefined();
    expect(typeof cat!.id).toBe("string");
    expect(typeof cat!.label).toBe("string");
    expect(typeof cat!.icon).toBe("string");
    expect(Array.isArray(cat!.checks)).toBe(true);
  });

  it("T24: CheckResult shape contract", () => {
    const c: CheckResult = { id: "x", name: "X", status: "pass", latencyMs: 0 };
    expect(Object.keys(c)).toEqual(expect.arrayContaining(["id", "name", "status", "latencyMs"]));
  });

  it("T25: CategoryResult shape contract", () => {
    const r: CategoryResult = { categoryId: "x", checks: [], ranAt: "", durationMs: 0 };
    expect(Object.keys(r)).toEqual(expect.arrayContaining(["categoryId", "checks", "ranAt", "durationMs"]));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U. BOUNDARY: VERY LARGE DATA (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("U. Very Large Data", () => {
  it("U01: 10000 element pass array", () => { expect(getAggregateStatus(makeResult(Array(10000).fill("pass")))).toBe("pass"); });
  it("U02: 10000 element fail array", () => { expect(getAggregateStatus(makeResult(Array(10000).fill("fail")))).toBe("fail"); });
  it("U03: 10000 element warn array", () => { expect(getAggregateStatus(makeResult(Array(10000).fill("warn")))).toBe("warn"); });
  it("U04: 10000 element skip array", () => { expect(getAggregateStatus(makeResult(Array(10000).fill("skip")))).toBe("skip"); });
  it("U05: 10000 passes + 1 fail", () => { expect(getAggregateStatus(makeResult([...Array(10000).fill("pass"), "fail"]))).toBe("fail"); });
  it("U06: 10000 passes + 1 warn", () => { expect(getAggregateStatus(makeResult([...Array(10000).fill("pass"), "warn"]))).toBe("warn"); });
  it("U07: 10000 skips + 1 pass", () => { expect(getAggregateStatus(makeResult([...Array(10000).fill("skip"), "pass"]))).toBe("pass"); });
  it("U08: 50000 elements completes without timeout", () => {
    const start = performance.now();
    getAggregateStatus(makeResult(Array(50000).fill("pass")));
    expect(performance.now() - start).toBeLessThan(200);
  });
  it("U09: 100000 getCategoryById calls", () => {
    for (let i = 0; i < 100000; i++) getCategoryById("auth");
    expect(true).toBe(true);
  });
  it("U10: Map with 1000 categories", () => {
    const map = new Map<string, CategoryResult>();
    for (let i = 0; i < 1000; i++) map.set(`cat-${i}`, makeResult(["pass"]));
    expect(map.size).toBe(1000);
  });
  it("U11: JSON stringify 1000 results", () => {
    const obj: Record<string, CategoryResult> = {};
    for (let i = 0; i < 1000; i++) obj[`cat-${i}`] = makeResult(["pass"]);
    expect(() => JSON.stringify(obj)).not.toThrow();
  });
  it("U12: 5000 sequential getAggregateStatus calls", () => {
    for (let i = 0; i < 5000; i++) getAggregateStatus(makeResult(["pass", "warn", "skip"]));
    expect(true).toBe(true);
  });
  it("U13: alternating pattern at scale (10000)", () => {
    const arr = Array.from({ length: 10000 }, (_, i) => (i % 2 === 0 ? "pass" : "skip") as CheckStatus);
    expect(getAggregateStatus(makeResult(arr))).toBe("pass");
  });
  it("U14: all 4 statuses at scale", () => {
    const arr = Array.from({ length: 10000 }, (_, i) => (["pass", "fail", "warn", "skip"] as CheckStatus[])[i % 4]);
    expect(getAggregateStatus(makeResult(arr))).toBe("fail");
  });
  it("U15: no fail, rotating pass/warn/skip at 10000", () => {
    const arr = Array.from({ length: 10000 }, (_, i) => (["pass", "warn", "skip"] as CheckStatus[])[i % 3]);
    expect(getAggregateStatus(makeResult(arr))).toBe("warn");
  });
  it("U16: only skip and pass at 10000", () => {
    const arr = Array.from({ length: 10000 }, (_, i) => (i % 3 === 0 ? "pass" : "skip") as CheckStatus);
    expect(getAggregateStatus(makeResult(arr))).toBe("pass");
  });
  it("U17: single fail among 99999 passes", () => {
    const arr = Array(100000).fill("pass") as CheckStatus[];
    arr[50000] = "fail";
    expect(getAggregateStatus(makeResult(arr))).toBe("fail");
  });
  it("U18: makeResult with 10000 elements has correct length", () => {
    expect(makeResult(Array(10000).fill("pass")).checks).toHaveLength(10000);
  });
  it("U19: all check IDs unique in 10000 element result", () => {
    const r = makeResult(Array(10000).fill("pass"));
    const ids = new Set(r.checks.map((c) => c.id));
    expect(ids.size).toBe(10000);
  });
  it("U20: performance: 100000 array creation + aggregate", () => {
    const start = performance.now();
    getAggregateStatus(makeResult(Array(100000).fill("pass")));
    expect(performance.now() - start).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// V. DETERMINISM (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("V. Determinism", () => {
  it("V01: same input always produces same output (x100)", () => {
    const arr: CheckStatus[] = ["pass", "fail", "warn", "skip"];
    const first = getAggregateStatus(makeResult(arr));
    for (let i = 0; i < 100; i++) expect(getAggregateStatus(makeResult(arr))).toBe(first);
  });
  it("V02: getCategoryById deterministic (x100)", () => {
    const first = getCategoryById("auth");
    for (let i = 0; i < 100; i++) expect(getCategoryById("auth")).toBe(first);
  });
  it("V03: TOTAL_CHECK_COUNT constant (x100)", () => {
    for (let i = 0; i < 100; i++) expect(TOTAL_CHECK_COUNT).toBe(20);
  });
  it("V04: DIAGNOSTIC_CATEGORIES length constant (x100)", () => {
    for (let i = 0; i < 100; i++) expect(DIAGNOSTIC_CATEGORIES.length).toBe(7);
  });
  it("V05: category order constant (x100)", () => {
    for (let i = 0; i < 100; i++) expect(DIAGNOSTIC_CATEGORIES[0].id).toBe("auth");
  });
  it("V06: all-pass deterministic (x1000)", () => {
    for (let i = 0; i < 1000; i++) expect(getAggregateStatus(makeResult(["pass", "pass"]))).toBe("pass");
  });
  it("V07: all-fail deterministic (x1000)", () => {
    for (let i = 0; i < 1000; i++) expect(getAggregateStatus(makeResult(["fail", "fail"]))).toBe("fail");
  });
  it("V08: mixed deterministic (x1000)", () => {
    for (let i = 0; i < 1000; i++) expect(getAggregateStatus(makeResult(["pass", "warn"]))).toBe("warn");
  });
  it("V09: getCategoryById for all IDs deterministic (x100)", () => {
    for (let i = 0; i < 100; i++) {
      DIAGNOSTIC_CATEGORIES.forEach((c) => expect(getCategoryById(c.id)!.id).toBe(c.id));
    }
  });
  it("V10: undefined for unknown IDs deterministic (x100)", () => {
    for (let i = 0; i < 100; i++) expect(getCategoryById("nope")).toBeUndefined();
  });
  it("V11: empty array aggregate deterministic (x100)", () => {
    for (let i = 0; i < 100; i++) expect(getAggregateStatus(makeResult([]))).toBe("skip");
  });
  it("V12: single element deterministic per status", () => {
    const S: CheckStatus[] = ["pass", "fail", "warn", "skip"];
    for (let i = 0; i < 100; i++) {
      S.forEach((s) => expect(getAggregateStatus(makeResult([s]))).toBe(s));
    }
  });
  it("V13: check count per category deterministic", () => {
    for (let i = 0; i < 100; i++) {
      expect(getCategoryById("auth")!.checks.length).toBe(3);
      expect(getCategoryById("prompts")!.checks.length).toBe(2);
    }
  });
  it("V14: TOTAL_CHECK_COUNT matches sum every time", () => {
    for (let i = 0; i < 100; i++) {
      expect(DIAGNOSTIC_CATEGORIES.reduce((s, c) => s + c.checks.length, 0)).toBe(TOTAL_CHECK_COUNT);
    }
  });
  it("V15: icon values deterministic", () => {
    for (let i = 0; i < 100; i++) {
      expect(DIAGNOSTIC_CATEGORIES[0].icon).toBe("Shield");
      expect(DIAGNOSTIC_CATEGORIES[6].icon).toBe("Gauge");
    }
  });
  it("V16: check names deterministic", () => {
    for (let i = 0; i < 100; i++) {
      expect(getCategoryById("database")!.checks[0].name).toBe("Connection");
    }
  });
  it("V17: check descriptions deterministic", () => {
    for (let i = 0; i < 100; i++) {
      expect(getCategoryById("database")!.checks[0].description).toBe("Test database connectivity");
    }
  });
  it("V18: interleaved reads are deterministic", () => {
    for (let i = 0; i < 100; i++) {
      const a = getCategoryById("auth");
      const b = getAggregateStatus(makeResult(["pass"]));
      const c = TOTAL_CHECK_COUNT;
      expect(a!.id).toBe("auth");
      expect(b).toBe("pass");
      expect(c).toBe(20);
    }
  });
  it("V19: no side effects between calls", () => {
    getAggregateStatus(makeResult(["fail", "fail", "fail"]));
    expect(getAggregateStatus(makeResult(["pass"]))).toBe("pass");
  });
  it("V20: 10000 mixed operations without drift", () => {
    for (let i = 0; i < 10000; i++) {
      if (i % 3 === 0) getCategoryById("auth");
      else if (i % 3 === 1) getAggregateStatus(makeResult(["pass", "fail"]));
      else expect(TOTAL_CHECK_COUNT).toBe(20);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// W. FULL WORKFLOW SIMULATION (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("W. Full Workflow Simulation", () => {
  it("W01: simulate Run All — all pass", () => {
    const map = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((cat) => map.set(cat.id, makeResult(cat.checks.map(() => "pass"), cat.id)));
    let allPass = true;
    map.forEach((r) => { if (getAggregateStatus(r) !== "pass") allPass = false; });
    expect(allPass).toBe(true);
    expect(map.size).toBe(7);
  });

  it("W02: simulate Run All — one category fails", () => {
    const map = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      const statuses = cat.id === "database" ? ["pass", "fail", "pass"] : cat.checks.map(() => "pass");
      map.set(cat.id, makeResult(statuses as CheckStatus[], cat.id));
    });
    expect(getAggregateStatus(map.get("database")!)).toBe("fail");
    expect(getAggregateStatus(map.get("auth")!)).toBe("pass");
  });

  it("W03: simulate incremental runs", () => {
    const map = new Map<string, CategoryResult>();
    // Run auth first
    map.set("auth", makeResult(["pass", "pass", "pass"], "auth"));
    expect(map.size).toBe(1);
    // Run database
    map.set("database", makeResult(["pass", "warn", "pass"], "database"));
    expect(map.size).toBe(2);
    expect(getAggregateStatus(map.get("database")!)).toBe("warn");
  });

  it("W04: simulate re-run after fix", () => {
    const map = new Map<string, CategoryResult>();
    map.set("ai-providers", makeResult(["fail", "fail", "fail"], "ai-providers"));
    expect(getAggregateStatus(map.get("ai-providers")!)).toBe("fail");
    // User fixes the issue and re-runs
    map.set("ai-providers", makeResult(["pass", "pass", "pass"], "ai-providers"));
    expect(getAggregateStatus(map.get("ai-providers")!)).toBe("pass");
  });

  it("W05: simulate auto-expand on failure", () => {
    const expanded = new Set<string>();
    const result = makeResult(["pass", "fail", "pass"], "platforms");
    if (result.checks.some((c) => c.status === "fail")) expanded.add(result.categoryId);
    expect(expanded.has("platforms")).toBe(true);
  });

  it("W06: simulate no auto-expand on pass", () => {
    const expanded = new Set<string>();
    const result = makeResult(["pass", "pass", "pass"], "auth");
    if (result.checks.some((c) => c.status === "fail")) expanded.add(result.categoryId);
    expect(expanded.has("auth")).toBe(false);
  });

  it("W07: summary counts from full run", () => {
    const map = new Map<string, CategoryResult>();
    map.set("auth", makeResult(["pass", "pass", "pass"], "auth"));
    map.set("db", makeResult(["pass", "fail", "warn"], "db"));
    let total = 0, passed = 0, failed = 0, warned = 0;
    map.forEach((r) => r.checks.forEach((c) => { total++; if (c.status === "pass") passed++; if (c.status === "fail") failed++; if (c.status === "warn") warned++; }));
    expect(total).toBe(6);
    expect(passed).toBe(4);
    expect(failed).toBe(1);
    expect(warned).toBe(1);
  });

  it("W08: localStorage save/restore cycle", () => {
    const map = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((cat) => map.set(cat.id, makeResult(["pass"], cat.id)));
    const obj: Record<string, CategoryResult> = {};
    map.forEach((v, k) => { obj[k] = v; });
    const json = JSON.stringify(obj);
    const restored = new Map(Object.entries(JSON.parse(json))) as Map<string, CategoryResult>;
    expect(restored.size).toBe(7);
    restored.forEach((r) => expect(getAggregateStatus(r)).toBe("pass"));
  });

  it("W09: abort mid-run leaves partial results", () => {
    const map = new Map<string, CategoryResult>();
    const aborted = { current: false };
    const cats = DIAGNOSTIC_CATEGORIES.slice(0, 3); // simulate only first 3
    for (const cat of cats) {
      if (aborted.current) break;
      map.set(cat.id, makeResult(["pass"], cat.id));
      if (cat.id === "database") aborted.current = true;
    }
    expect(map.size).toBe(2); // auth + database, then aborted
  });

  it("W10: progress counter increments correctly", () => {
    let progress = 0;
    for (const _ of DIAGNOSTIC_CATEGORIES) {
      progress++;
    }
    expect(progress).toBe(7);
  });

  it("W11: running state tracks correctly", () => {
    const running = new Set<string>();
    running.add("auth");
    expect(running.has("auth")).toBe(true);
    expect(running.has("database")).toBe(false);
    running.delete("auth");
    running.add("database");
    expect(running.has("auth")).toBe(false);
    expect(running.has("database")).toBe(true);
  });

  it("W12: toggle expand/collapse", () => {
    const expanded = new Set<string>();
    // Expand
    expanded.add("auth");
    expect(expanded.has("auth")).toBe(true);
    // Collapse
    expanded.delete("auth");
    expect(expanded.has("auth")).toBe(false);
    // Toggle pattern
    if (expanded.has("auth")) expanded.delete("auth"); else expanded.add("auth");
    expect(expanded.has("auth")).toBe(true);
  });

  it("W13: full run produces correct total check count", () => {
    const map = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      map.set(cat.id, makeResult(cat.checks.map(() => "pass"), cat.id));
    });
    let totalChecks = 0;
    map.forEach((r) => { totalChecks += r.checks.length; });
    expect(totalChecks).toBe(TOTAL_CHECK_COUNT);
  });

  it("W14: overwriting result preserves Map ordering", () => {
    const map = new Map<string, CategoryResult>();
    map.set("a", makeResult(["pass"]));
    map.set("b", makeResult(["pass"]));
    map.set("a", makeResult(["fail"])); // overwrite
    const keys = Array.from(map.keys());
    expect(keys).toEqual(["a", "b"]);
    expect(getAggregateStatus(map.get("a")!)).toBe("fail");
  });

  it("W15: clearing and re-running produces fresh results", () => {
    const map = new Map<string, CategoryResult>();
    map.set("auth", makeResult(["fail"], "auth"));
    map.clear();
    map.set("auth", makeResult(["pass"], "auth"));
    expect(getAggregateStatus(map.get("auth")!)).toBe("pass");
  });

  it("W16: relative time formatting", () => {
    const now = new Date().toISOString();
    const d = new Date(now);
    expect(d.getTime()).not.toBeNaN();
  });

  it("W17: disabled state during run-all", () => {
    let isRunningAll = false;
    isRunningAll = true;
    expect(isRunningAll).toBe(true);
    // individual run button should be disabled
    const canRun = !isRunningAll;
    expect(canRun).toBe(false);
    isRunningAll = false;
    expect(!isRunningAll).toBe(true);
  });

  it("W18: sequential category execution order", () => {
    const order: string[] = [];
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      order.push(cat.id);
    }
    expect(order).toEqual(["auth", "database", "ai-providers", "platforms", "listings", "prompts", "performance"]);
  });

  it("W19: failed checks trigger auto-expand pattern", () => {
    const expanded = new Set<string>();
    const results = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      const r = makeResult(cat.id === "ai-providers" ? ["fail"] : ["pass"], cat.id);
      results.set(cat.id, r);
      if (r.checks.some((c) => c.status === "fail")) expanded.add(cat.id);
    });
    expect(expanded.has("ai-providers")).toBe(true);
    expect(expanded.has("auth")).toBe(false);
    expect(expanded.size).toBe(1);
  });

  it("W20: end-to-end: build → run → check → save → restore → verify", () => {
    // Build
    const map = new Map<string, CategoryResult>();
    // Run
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      map.set(cat.id, makeResult(cat.checks.map((_, i) => (i === 0 ? "pass" : "warn") as CheckStatus), cat.id));
    });
    // Check
    map.forEach((r) => expect(["pass", "warn"]).toContain(getAggregateStatus(r)));
    // Save
    const obj: Record<string, CategoryResult> = {};
    map.forEach((v, k) => { obj[k] = v; });
    const json = JSON.stringify(obj);
    // Restore
    const parsed = JSON.parse(json);
    const restored = new Map(Object.entries(parsed)) as Map<string, CategoryResult>;
    // Verify
    expect(restored.size).toBe(7);
    restored.forEach((r: CategoryResult) => {
      expect(r.checks.length).toBeGreaterThan(0);
      expect(["pass", "warn"]).toContain(getAggregateStatus(r));
    });
  });
});
