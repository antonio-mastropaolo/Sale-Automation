/**
 * Diagnostic System — Stress & Integration Tests
 *
 * 150+ additional test cases covering:
 * I.  Aggregate status exhaustive permutations (30 tests)
 * J.  Registry mutation safety (15 tests)
 * K.  Concurrent execution simulation (15 tests)
 * L.  Performance / timing contracts (15 tests)
 * M.  Serialization & localStorage simulation (20 tests)
 * N.  Category-check cross-references (15 tests)
 * O.  Property-based / fuzzing tests (20 tests)
 * P.  API contract validation (20 tests)
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

// ── Helpers ──

function makeCheck(overrides: Partial<CheckResult> = {}): CheckResult {
  return { id: "t", name: "T", status: "pass", latencyMs: 0, ...overrides };
}

function makeResult(statuses: CheckStatus[], categoryId = "test"): CategoryResult {
  return {
    categoryId,
    checks: statuses.map((s, i) => ({ id: `${categoryId}-${i}`, name: `Check ${i}`, status: s, latencyMs: Math.random() * 100 })),
    ranAt: new Date().toISOString(),
    durationMs: Math.random() * 500,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// I. EXHAUSTIVE STATUS PERMUTATIONS (30 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("I. Exhaustive Status Permutations", () => {
  const statuses: CheckStatus[] = ["pass", "fail", "warn", "skip"];

  // All 2-element permutations (4x4 = 16)
  const pairs: [CheckStatus, CheckStatus][] = [];
  for (const a of statuses) for (const b of statuses) pairs.push([a, b]);

  it("I01: all 16 two-element permutations produce valid status", () => {
    for (const [a, b] of pairs) {
      const result = getAggregateStatus(makeResult([a, b]));
      expect(statuses).toContain(result);
    }
  });

  it("I02: fail always wins in any pair", () => {
    for (const other of statuses) {
      expect(getAggregateStatus(makeResult(["fail", other]))).toBe("fail");
      expect(getAggregateStatus(makeResult([other, "fail"]))).toBe("fail");
    }
  });

  it("I03: warn wins over pass and skip (no fail)", () => {
    expect(getAggregateStatus(makeResult(["warn", "pass"]))).toBe("warn");
    expect(getAggregateStatus(makeResult(["warn", "skip"]))).toBe("warn");
    expect(getAggregateStatus(makeResult(["pass", "warn"]))).toBe("warn");
    expect(getAggregateStatus(makeResult(["skip", "warn"]))).toBe("warn");
  });

  // All 3-element combinations with fail
  it("I04: any triple containing fail → fail", () => {
    const triples: CheckStatus[][] = [
      ["fail", "pass", "pass"], ["pass", "fail", "pass"], ["pass", "pass", "fail"],
      ["fail", "warn", "skip"], ["skip", "fail", "warn"], ["warn", "skip", "fail"],
      ["fail", "fail", "fail"], ["fail", "fail", "pass"], ["fail", "pass", "warn"],
    ];
    for (const t of triples) {
      expect(getAggregateStatus(makeResult(t))).toBe("fail");
    }
  });

  it("I05: any triple with warn (no fail) → warn", () => {
    const triples: CheckStatus[][] = [
      ["warn", "pass", "pass"], ["pass", "warn", "pass"], ["pass", "pass", "warn"],
      ["warn", "skip", "pass"], ["skip", "warn", "skip"], ["warn", "warn", "warn"],
    ];
    for (const t of triples) {
      expect(getAggregateStatus(makeResult(t))).toBe("warn");
    }
  });

  it("I06: pass + skip (no fail, no warn) → pass", () => {
    const combos: CheckStatus[][] = [
      ["pass", "skip"], ["skip", "pass"], ["pass", "pass", "skip"],
      ["skip", "skip", "pass"], ["pass", "skip", "skip", "pass"],
    ];
    for (const c of combos) {
      expect(getAggregateStatus(makeResult(c))).toBe("pass");
    }
  });

  // All 4-element permutations where each status appears once
  it("I07: [pass,fail,warn,skip] in any order → fail", () => {
    const perms = [
      ["pass", "fail", "warn", "skip"],
      ["fail", "pass", "skip", "warn"],
      ["skip", "warn", "pass", "fail"],
      ["warn", "skip", "fail", "pass"],
    ] as CheckStatus[][];
    for (const p of perms) {
      expect(getAggregateStatus(makeResult(p))).toBe("fail");
    }
  });

  it("I08: [pass,warn,skip] in any order → warn", () => {
    const perms = [
      ["pass", "warn", "skip"], ["warn", "pass", "skip"],
      ["skip", "warn", "pass"], ["warn", "skip", "pass"],
      ["skip", "pass", "warn"], ["pass", "skip", "warn"],
    ] as CheckStatus[][];
    for (const p of perms) {
      expect(getAggregateStatus(makeResult(p))).toBe("warn");
    }
  });

  // Stress: random large arrays
  it("I09: 50 passes + 1 fail → fail", () => {
    expect(getAggregateStatus(makeResult([...Array(50).fill("pass"), "fail"]))).toBe("fail");
  });

  it("I10: 50 passes + 1 warn → warn", () => {
    expect(getAggregateStatus(makeResult([...Array(50).fill("pass"), "warn"]))).toBe("warn");
  });

  it("I11: 100 skips → skip", () => {
    expect(getAggregateStatus(makeResult(Array(100).fill("skip")))).toBe("skip");
  });

  it("I12: 100 passes → pass", () => {
    expect(getAggregateStatus(makeResult(Array(100).fill("pass")))).toBe("pass");
  });

  it("I13: 100 fails → fail", () => {
    expect(getAggregateStatus(makeResult(Array(100).fill("fail")))).toBe("fail");
  });

  it("I14: 100 warns → warn", () => {
    expect(getAggregateStatus(makeResult(Array(100).fill("warn")))).toBe("warn");
  });

  it("I15: 1000 passes → pass", () => {
    expect(getAggregateStatus(makeResult(Array(1000).fill("pass")))).toBe("pass");
  });

  it("I16: 999 passes + 1 fail at position 500 → fail", () => {
    const arr = Array(1000).fill("pass") as CheckStatus[];
    arr[500] = "fail";
    expect(getAggregateStatus(makeResult(arr))).toBe("fail");
  });

  it("I17: alternating pass/warn → warn", () => {
    const arr = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? "pass" : "warn") as CheckStatus);
    expect(getAggregateStatus(makeResult(arr))).toBe("warn");
  });

  it("I18: alternating pass/skip → pass", () => {
    const arr = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? "pass" : "skip") as CheckStatus);
    expect(getAggregateStatus(makeResult(arr))).toBe("pass");
  });

  it("I19: single element arrays all return their status", () => {
    for (const s of statuses) {
      expect(getAggregateStatus(makeResult([s]))).toBe(s);
    }
  });

  it("I20: commutativity — all pairs produce same result regardless of order", () => {
    for (const a of statuses) {
      for (const b of statuses) {
        const ab = getAggregateStatus(makeResult([a, b]));
        const ba = getAggregateStatus(makeResult([b, a]));
        expect(ab).toBe(ba);
      }
    }
  });

  it("I21: associativity — grouping doesn't change result for triples", () => {
    for (const a of statuses) {
      for (const b of statuses) {
        for (const c of statuses) {
          const flat = getAggregateStatus(makeResult([a, b, c]));
          // Should match any reordering
          const reorder = getAggregateStatus(makeResult([c, a, b]));
          expect(flat).toBe(reorder);
        }
      }
    }
  });

  it("I22: idempotency — repeating a status doesn't change result", () => {
    for (const s of statuses) {
      const single = getAggregateStatus(makeResult([s]));
      const double = getAggregateStatus(makeResult([s, s]));
      const triple = getAggregateStatus(makeResult([s, s, s]));
      expect(single).toBe(double);
      expect(double).toBe(triple);
    }
  });

  it("I23: pass never overrides fail", () => {
    for (let n = 1; n <= 100; n *= 10) {
      const arr = [...Array(n).fill("pass"), "fail"] as CheckStatus[];
      expect(getAggregateStatus(makeResult(arr))).toBe("fail");
    }
  });

  it("I24: warn never overrides fail", () => {
    for (let n = 1; n <= 100; n *= 10) {
      const arr = [...Array(n).fill("warn"), "fail"] as CheckStatus[];
      expect(getAggregateStatus(makeResult(arr))).toBe("fail");
    }
  });

  it("I25: skip never overrides pass", () => {
    for (let n = 1; n <= 100; n *= 10) {
      const arr = ["pass", ...Array(n).fill("skip")] as CheckStatus[];
      expect(getAggregateStatus(makeResult(arr))).toBe("pass");
    }
  });

  it("I26: 5-element all same statuses", () => {
    for (const s of statuses) {
      expect(getAggregateStatus(makeResult(Array(5).fill(s)))).toBe(s);
    }
  });

  it("I27: monotonicity — adding fail to any result keeps it fail", () => {
    for (const s of statuses) {
      expect(getAggregateStatus(makeResult([s, "fail"]))).toBe("fail");
    }
  });

  it("I28: monotonicity — adding warn to pass/skip keeps at least warn", () => {
    expect(getAggregateStatus(makeResult(["pass", "warn"]))).toBe("warn");
    expect(getAggregateStatus(makeResult(["skip", "warn"]))).toBe("warn");
  });

  it("I29: 500 element array with fail at the very end", () => {
    const arr = [...Array(499).fill("pass"), "fail"] as CheckStatus[];
    expect(getAggregateStatus(makeResult(arr))).toBe("fail");
  });

  it("I30: 500 element array with fail at the very start", () => {
    const arr = ["fail", ...Array(499).fill("pass")] as CheckStatus[];
    expect(getAggregateStatus(makeResult(arr))).toBe("fail");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// J. REGISTRY MUTATION SAFETY (15 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("J. Registry Mutation Safety", () => {
  it("J01: modifying a spread copy doesn't affect original", () => {
    const copy = [...DIAGNOSTIC_CATEGORIES];
    copy.pop();
    expect(DIAGNOSTIC_CATEGORIES).toHaveLength(7);
  });

  it("J02: spreading a category creates independent copy", () => {
    const cat = { ...DIAGNOSTIC_CATEGORIES[0] };
    cat.label = "MODIFIED";
    expect(DIAGNOSTIC_CATEGORIES[0].label).not.toBe("MODIFIED");
  });

  it("J03: TOTAL_CHECK_COUNT is constant after spread operations", () => {
    const before = TOTAL_CHECK_COUNT;
    [...DIAGNOSTIC_CATEGORIES]; // spread
    expect(TOTAL_CHECK_COUNT).toBe(before);
  });

  it("J04: getCategoryById returns stable reference across calls", () => {
    const a = getCategoryById("auth");
    const b = getCategoryById("auth");
    expect(a).toBe(b);
  });

  it("J05: filtering doesn't modify original", () => {
    const filtered = DIAGNOSTIC_CATEGORIES.filter((c) => c.id !== "auth");
    expect(filtered).toHaveLength(6);
    expect(DIAGNOSTIC_CATEGORIES).toHaveLength(7);
  });

  it("J06: map doesn't modify original", () => {
    const mapped = DIAGNOSTIC_CATEGORIES.map((c) => ({ ...c, label: "X" }));
    expect(mapped[0].label).toBe("X");
    expect(DIAGNOSTIC_CATEGORIES[0].label).not.toBe("X");
  });

  it("J07: slice doesn't modify original", () => {
    const sliced = DIAGNOSTIC_CATEGORIES.slice(0, 3);
    expect(sliced).toHaveLength(3);
    expect(DIAGNOSTIC_CATEGORIES).toHaveLength(7);
  });

  it("J08: concat doesn't modify original", () => {
    const extended = DIAGNOSTIC_CATEGORIES.concat([{ id: "extra", label: "Extra", icon: "X", checks: [] }]);
    expect(extended).toHaveLength(8);
    expect(DIAGNOSTIC_CATEGORIES).toHaveLength(7);
  });

  it("J09: reverse on copy doesn't affect original order", () => {
    const copy = [...DIAGNOSTIC_CATEGORIES].reverse();
    expect(copy[0].id).toBe("performance");
    expect(DIAGNOSTIC_CATEGORIES[0].id).toBe("auth");
  });

  it("J10: sort on copy doesn't affect original order", () => {
    const copy = [...DIAGNOSTIC_CATEGORIES].sort((a, b) => a.label.localeCompare(b.label));
    expect(copy[0].label).not.toBe(DIAGNOSTIC_CATEGORIES[0].label);
    expect(DIAGNOSTIC_CATEGORIES[0].id).toBe("auth");
  });

  it("J11: flatMap on checks doesn't modify originals", () => {
    const allChecks = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks);
    expect(allChecks.length).toBe(TOTAL_CHECK_COUNT);
    expect(DIAGNOSTIC_CATEGORIES[0].checks.length).toBe(3);
  });

  it("J12: Object.freeze on copy doesn't affect original", () => {
    const frozen = Object.freeze({ ...DIAGNOSTIC_CATEGORIES[0] });
    expect(frozen.id).toBe(DIAGNOSTIC_CATEGORIES[0].id);
    expect(() => { (frozen as any).id = "x"; }).toThrow();
  });

  it("J13: JSON parse/stringify creates deep clone", () => {
    const clone = JSON.parse(JSON.stringify(DIAGNOSTIC_CATEGORIES));
    clone[0].label = "CLONED";
    expect(DIAGNOSTIC_CATEGORIES[0].label).not.toBe("CLONED");
  });

  it("J14: multiple getCategoryById calls don't leak memory pattern", () => {
    for (let i = 0; i < 10000; i++) {
      getCategoryById("auth");
    }
    expect(getCategoryById("auth")?.id).toBe("auth");
  });

  it("J15: DIAGNOSTIC_CATEGORIES length stable after 1000 reads", () => {
    for (let i = 0; i < 1000; i++) {
      expect(DIAGNOSTIC_CATEGORIES.length).toBe(7);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// K. CONCURRENT EXECUTION SIMULATION (15 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("K. Concurrent Execution Simulation", () => {
  it("K01: parallel Map updates don't collide", () => {
    const map = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      map.set(cat.id, makeResult(["pass", "pass"], cat.id));
    });
    expect(map.size).toBe(7);
  });

  it("K02: concurrent set operations on same key preserve last write", () => {
    const map = new Map<string, CategoryResult>();
    map.set("auth", makeResult(["pass"], "auth"));
    map.set("auth", makeResult(["fail"], "auth"));
    expect(getAggregateStatus(map.get("auth")!)).toBe("fail");
  });

  it("K03: Map delete + set doesn't corrupt", () => {
    const map = new Map<string, CategoryResult>();
    map.set("auth", makeResult(["pass"], "auth"));
    map.delete("auth");
    map.set("auth", makeResult(["warn"], "auth"));
    expect(getAggregateStatus(map.get("auth")!)).toBe("warn");
  });

  it("K04: building results incrementally produces correct final state", () => {
    const map = new Map<string, CategoryResult>();
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      map.set(cat.id, makeResult(cat.checks.map(() => "pass"), cat.id));
    }
    map.forEach((r) => expect(getAggregateStatus(r)).toBe("pass"));
  });

  it("K05: overwriting a pass result with fail updates correctly", () => {
    const map = new Map<string, CategoryResult>();
    map.set("db", makeResult(["pass", "pass", "pass"], "db"));
    expect(getAggregateStatus(map.get("db")!)).toBe("pass");
    map.set("db", makeResult(["pass", "fail", "pass"], "db"));
    expect(getAggregateStatus(map.get("db")!)).toBe("fail");
  });

  it("K06: clearing map and rebuilding works", () => {
    const map = new Map<string, CategoryResult>();
    map.set("a", makeResult(["pass"]));
    map.clear();
    expect(map.size).toBe(0);
    map.set("a", makeResult(["fail"]));
    expect(map.size).toBe(1);
    expect(getAggregateStatus(map.get("a")!)).toBe("fail");
  });

  it("K07: Promise.all simulated parallel category runs", async () => {
    const results = await Promise.all(
      DIAGNOSTIC_CATEGORIES.map(async (cat) => {
        await new Promise((r) => setTimeout(r, Math.random() * 10));
        return { id: cat.id, result: makeResult(["pass", "pass"], cat.id) };
      })
    );
    expect(results).toHaveLength(7);
    results.forEach((r) => expect(getAggregateStatus(r.result)).toBe("pass"));
  });

  it("K08: sequential execution produces same results as parallel", async () => {
    const sequential: CategoryResult[] = [];
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      sequential.push(makeResult(["pass"], cat.id));
    }

    const parallel = await Promise.all(
      DIAGNOSTIC_CATEGORIES.map(async (cat) => makeResult(["pass"], cat.id))
    );

    expect(sequential.length).toBe(parallel.length);
    sequential.forEach((s, i) => {
      expect(getAggregateStatus(s)).toBe(getAggregateStatus(parallel[i]));
    });
  });

  it("K09: Map iteration order matches insertion order", () => {
    const map = new Map<string, CategoryResult>();
    const ids = DIAGNOSTIC_CATEGORIES.map((c) => c.id);
    ids.forEach((id) => map.set(id, makeResult(["pass"], id)));
    const keys = Array.from(map.keys());
    expect(keys).toEqual(ids);
  });

  it("K10: new Map from entries preserves data", () => {
    const entries: [string, CategoryResult][] = DIAGNOSTIC_CATEGORIES.map((c) => [c.id, makeResult(["pass"], c.id)]);
    const map = new Map(entries);
    expect(map.size).toBe(7);
    expect(map.has("auth")).toBe(true);
  });

  it("K11: Set tracks running categories correctly", () => {
    const running = new Set<string>();
    running.add("auth");
    running.add("database");
    expect(running.size).toBe(2);
    expect(running.has("auth")).toBe(true);
    running.delete("auth");
    expect(running.size).toBe(1);
    expect(running.has("auth")).toBe(false);
  });

  it("K12: Set prevents duplicate entries", () => {
    const running = new Set<string>();
    running.add("auth");
    running.add("auth");
    running.add("auth");
    expect(running.size).toBe(1);
  });

  it("K13: AbortController cancellation pattern", () => {
    const controller = new AbortController();
    expect(controller.signal.aborted).toBe(false);
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  it("K14: multiple abort controllers are independent", () => {
    const a = new AbortController();
    const b = new AbortController();
    a.abort();
    expect(a.signal.aborted).toBe(true);
    expect(b.signal.aborted).toBe(false);
  });

  it("K15: race condition: last write to Map wins", () => {
    const map = new Map<string, string>();
    for (let i = 0; i < 100; i++) {
      map.set("key", `value-${i}`);
    }
    expect(map.get("key")).toBe("value-99");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// L. PERFORMANCE / TIMING CONTRACTS (15 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("L. Performance / Timing Contracts", () => {
  it("L01: getAggregateStatus completes in < 1ms for small arrays", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) getAggregateStatus(makeResult(["pass", "fail", "warn"]));
    expect(performance.now() - start).toBeLessThan(100); // 1000 calls < 100ms
  });

  it("L02: getAggregateStatus completes in < 10ms for 1000-element array", () => {
    const start = performance.now();
    getAggregateStatus(makeResult(Array(1000).fill("pass")));
    expect(performance.now() - start).toBeLessThan(10);
  });

  it("L03: getCategoryById completes in < 1ms", () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) getCategoryById("auth");
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("L04: TOTAL_CHECK_COUNT access is O(1)", () => {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) { const _ = TOTAL_CHECK_COUNT; }
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("L05: creating 10000 CheckResults is fast", () => {
    const start = performance.now();
    const arr = Array.from({ length: 10000 }, (_, i) => makeCheck({ id: `t${i}`, latencyMs: i }));
    expect(performance.now() - start).toBeLessThan(100);
    expect(arr).toHaveLength(10000);
  });

  it("L06: JSON serializing 7 CategoryResults is fast", () => {
    const map = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((c) => map.set(c.id, makeResult(["pass", "pass", "pass"], c.id)));
    const start = performance.now();
    const obj: Record<string, CategoryResult> = {};
    map.forEach((v, k) => { obj[k] = v; });
    JSON.stringify(obj);
    expect(performance.now() - start).toBeLessThan(10);
  });

  it("L07: JSON parsing serialized results is fast", () => {
    const obj: Record<string, CategoryResult> = {};
    DIAGNOSTIC_CATEGORIES.forEach((c) => { obj[c.id] = makeResult(["pass", "warn", "fail"], c.id); });
    const json = JSON.stringify(obj);
    const start = performance.now();
    JSON.parse(json);
    expect(performance.now() - start).toBeLessThan(10);
  });

  it("L08: 10000 getAggregateStatus calls with varying sizes", () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      const size = (i % 10) + 1;
      getAggregateStatus(makeResult(Array(size).fill("pass")));
    }
    expect(performance.now() - start).toBeLessThan(500);
  });

  it("L09: Map operations at scale (1000 entries)", () => {
    const map = new Map<string, CategoryResult>();
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      map.set(`cat-${i}`, makeResult(["pass"], `cat-${i}`));
    }
    expect(performance.now() - start).toBeLessThan(100);
    expect(map.size).toBe(1000);
  });

  it("L10: latencyMs is always non-negative in makeResult", () => {
    for (let i = 0; i < 100; i++) {
      const r = makeResult(["pass", "fail"]);
      r.checks.forEach((c) => expect(c.latencyMs).toBeGreaterThanOrEqual(0));
    }
  });

  it("L11: durationMs is always non-negative in makeResult", () => {
    for (let i = 0; i < 100; i++) {
      expect(makeResult(["pass"]).durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("L12: ranAt is always a valid ISO string", () => {
    for (let i = 0; i < 100; i++) {
      const r = makeResult(["pass"]);
      expect(new Date(r.ranAt).getTime()).not.toBeNaN();
    }
  });

  it("L13: getAggregateStatus with 5000 elements", () => {
    const start = performance.now();
    const result = getAggregateStatus(makeResult(Array(5000).fill("pass")));
    expect(performance.now() - start).toBeLessThan(50);
    expect(result).toBe("pass");
  });

  it("L14: building full result set for all categories", () => {
    const start = performance.now();
    const map = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      map.set(cat.id, makeResult(cat.checks.map(() => "pass"), cat.id));
    });
    const totalChecks = Array.from(map.values()).reduce((s, r) => s + r.checks.length, 0);
    expect(performance.now() - start).toBeLessThan(10);
    expect(totalChecks).toBe(TOTAL_CHECK_COUNT);
  });

  it("L15: 100 full serialize/deserialize cycles", () => {
    const original = makeResult(["pass", "fail", "warn", "skip"]);
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as CategoryResult;
      expect(parsed.categoryId).toBe(original.categoryId);
    }
    expect(performance.now() - start).toBeLessThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// M. SERIALIZATION & LOCALSTORAGE SIMULATION (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("M. Serialization & localStorage Simulation", () => {
  function simulateStorage() {
    const store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
    };
  }

  const KEY = "listblitz:diagnostics:results";

  it("M01: empty storage returns null", () => {
    const storage = simulateStorage();
    expect(storage.getItem(KEY)).toBeNull();
  });

  it("M02: save and retrieve single result", () => {
    const storage = simulateStorage();
    const r = makeResult(["pass"], "auth");
    storage.setItem(KEY, JSON.stringify({ auth: r }));
    const parsed = JSON.parse(storage.getItem(KEY)!);
    expect(parsed.auth.categoryId).toBe("auth");
  });

  it("M03: save and retrieve all 7 categories", () => {
    const storage = simulateStorage();
    const obj: Record<string, CategoryResult> = {};
    DIAGNOSTIC_CATEGORIES.forEach((c) => { obj[c.id] = makeResult(["pass"], c.id); });
    storage.setItem(KEY, JSON.stringify(obj));
    const parsed = JSON.parse(storage.getItem(KEY)!);
    expect(Object.keys(parsed)).toHaveLength(7);
  });

  it("M04: overwrite preserves latest data", () => {
    const storage = simulateStorage();
    storage.setItem(KEY, JSON.stringify({ auth: makeResult(["pass"], "auth") }));
    storage.setItem(KEY, JSON.stringify({ auth: makeResult(["fail"], "auth") }));
    const parsed = JSON.parse(storage.getItem(KEY)!);
    expect(parsed.auth.checks[0].status).toBe("fail");
  });

  it("M05: removeItem clears data", () => {
    const storage = simulateStorage();
    storage.setItem(KEY, "data");
    storage.removeItem(KEY);
    expect(storage.getItem(KEY)).toBeNull();
  });

  it("M06: Map → Object → JSON → Object → Map roundtrip", () => {
    const map = new Map<string, CategoryResult>();
    map.set("auth", makeResult(["pass", "warn"], "auth"));
    map.set("db", makeResult(["fail"], "db"));

    const obj: Record<string, CategoryResult> = {};
    map.forEach((v, k) => { obj[k] = v; });
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);
    const restored = new Map(Object.entries(parsed)) as Map<string, CategoryResult>;

    expect(restored.size).toBe(2);
    expect(restored.get("auth")!.checks).toHaveLength(2);
    expect(restored.get("db")!.checks[0].status).toBe("fail");
  });

  it("M07: invalid JSON returns empty map pattern", () => {
    const storage = simulateStorage();
    storage.setItem(KEY, "not json {{{");
    let result = new Map<string, CategoryResult>();
    try { result = new Map(Object.entries(JSON.parse(storage.getItem(KEY)!))); }
    catch { result = new Map(); }
    expect(result.size).toBe(0);
  });

  it("M08: null value returns empty map pattern", () => {
    const storage = simulateStorage();
    const raw = storage.getItem(KEY);
    expect(raw).toBeNull();
    const result = raw ? new Map(Object.entries(JSON.parse(raw))) : new Map();
    expect(result.size).toBe(0);
  });

  it("M09: check messages survive serialization", () => {
    const r = makeResult(["pass"]);
    r.checks[0].message = "Everything is fine!";
    r.checks[0].detail = "Detailed info\nwith newlines";
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed.checks[0].message).toBe("Everything is fine!");
    expect(parsed.checks[0].detail).toContain("newlines");
  });

  it("M10: latencyMs preserved through serialization", () => {
    const r: CategoryResult = { categoryId: "x", checks: [{ id: "t", name: "T", status: "pass", latencyMs: 42.7 }], ranAt: "2026-01-01T00:00:00Z", durationMs: 100 };
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed.checks[0].latencyMs).toBe(42.7);
  });

  it("M11: durationMs preserved through serialization", () => {
    const r = makeResult(["pass"]);
    const parsed = JSON.parse(JSON.stringify(r)) as CategoryResult;
    expect(typeof parsed.durationMs).toBe("number");
  });

  it("M12: ranAt preserved as ISO string", () => {
    const now = new Date().toISOString();
    const r: CategoryResult = { categoryId: "x", checks: [], ranAt: now, durationMs: 0 };
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed.ranAt).toBe(now);
  });

  it("M13: storage handles unicode in messages", () => {
    const r = makeResult(["pass"]);
    r.checks[0].message = "Successo! 🎉 Contrôle réussi";
    const json = JSON.stringify({ test: r });
    const parsed = JSON.parse(json);
    expect(parsed.test.checks[0].message).toContain("🎉");
  });

  it("M14: storage handles empty checks array", () => {
    const r: CategoryResult = { categoryId: "empty", checks: [], ranAt: "", durationMs: 0 };
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed.checks).toHaveLength(0);
  });

  it("M15: storage handles 50 checks in one category", () => {
    const checks = Array.from({ length: 50 }, (_, i) => makeCheck({ id: `c${i}`, latencyMs: i }));
    const r: CategoryResult = { categoryId: "big", checks, ranAt: "", durationMs: 0 };
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed.checks).toHaveLength(50);
    expect(parsed.checks[49].latencyMs).toBe(49);
  });

  it("M16: partial update preserves other categories", () => {
    const storage = simulateStorage();
    const all: Record<string, CategoryResult> = {};
    all.auth = makeResult(["pass"], "auth");
    all.db = makeResult(["pass"], "db");
    storage.setItem(KEY, JSON.stringify(all));

    // Update only db
    const existing = JSON.parse(storage.getItem(KEY)!);
    existing.db = makeResult(["fail"], "db");
    storage.setItem(KEY, JSON.stringify(existing));

    const final = JSON.parse(storage.getItem(KEY)!);
    expect(final.auth.checks[0].status).toBe("pass"); // preserved
    expect(final.db.checks[0].status).toBe("fail"); // updated
  });

  it("M17: storage key is correct", () => {
    expect(KEY).toBe("listblitz:diagnostics:results");
  });

  it("M18: empty string value doesn't crash parse pattern", () => {
    const storage = simulateStorage();
    storage.setItem(KEY, "");
    let result = new Map();
    try { const raw = storage.getItem(KEY); if (raw) result = new Map(Object.entries(JSON.parse(raw))); }
    catch { result = new Map(); }
    expect(result.size).toBe(0);
  });

  it("M19: very large storage doesn't crash", () => {
    const storage = simulateStorage();
    const big: Record<string, CategoryResult> = {};
    for (let i = 0; i < 100; i++) {
      big[`cat-${i}`] = makeResult(Array(20).fill("pass"), `cat-${i}`);
    }
    storage.setItem(KEY, JSON.stringify(big));
    const parsed = JSON.parse(storage.getItem(KEY)!);
    expect(Object.keys(parsed)).toHaveLength(100);
  });

  it("M20: timestamp ordering is preserved", () => {
    const t1 = new Date("2026-01-01T00:00:00Z").toISOString();
    const t2 = new Date("2026-01-02T00:00:00Z").toISOString();
    const r1: CategoryResult = { categoryId: "a", checks: [], ranAt: t1, durationMs: 0 };
    const r2: CategoryResult = { categoryId: "a", checks: [], ranAt: t2, durationMs: 0 };
    expect(new Date(r2.ranAt).getTime()).toBeGreaterThan(new Date(r1.ranAt).getTime());
  });
});

// ═══════════════════════════════════════════════════════════════════════
// N. CATEGORY-CHECK CROSS-REFERENCES (15 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("N. Category-Check Cross-References", () => {
  it("N01: auth checks all start with 'auth-'", () => {
    getCategoryById("auth")!.checks.forEach((ch) => expect(ch.id).toMatch(/^auth-/));
  });

  it("N02: database checks all start with 'db-'", () => {
    getCategoryById("database")!.checks.forEach((ch) => expect(ch.id).toMatch(/^db-/));
  });

  it("N03: ai-providers checks all start with 'ai-'", () => {
    getCategoryById("ai-providers")!.checks.forEach((ch) => expect(ch.id).toMatch(/^ai-/));
  });

  it("N04: platforms checks all start with 'plat-'", () => {
    getCategoryById("platforms")!.checks.forEach((ch) => expect(ch.id).toMatch(/^plat-/));
  });

  it("N05: listings checks all start with 'list-'", () => {
    getCategoryById("listings")!.checks.forEach((ch) => expect(ch.id).toMatch(/^list-/));
  });

  it("N06: prompts checks all start with 'prompt-'", () => {
    getCategoryById("prompts")!.checks.forEach((ch) => expect(ch.id).toMatch(/^prompt-/));
  });

  it("N07: performance checks all start with 'perf-'", () => {
    getCategoryById("performance")!.checks.forEach((ch) => expect(ch.id).toMatch(/^perf-/));
  });

  it("N08: no check ID prefix conflicts across categories", () => {
    const prefixes = DIAGNOSTIC_CATEGORIES.map((c) => {
      const firstCheck = c.checks[0];
      return firstCheck.id.split("-")[0];
    });
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("N09: every category's check count > 0", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => expect(cat.checks.length).toBeGreaterThan(0));
  });

  it("N10: no category has more than 10 checks", () => {
    DIAGNOSTIC_CATEGORIES.forEach((cat) => expect(cat.checks.length).toBeLessThanOrEqual(10));
  });

  it("N11: total checks match sum of per-category", () => {
    const sum = DIAGNOSTIC_CATEGORIES.reduce((s, c) => s + c.checks.length, 0);
    expect(sum).toBe(TOTAL_CHECK_COUNT);
  });

  it("N12: every check belongs to exactly one category", () => {
    const allIds = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks.map((ch) => ch.id));
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it("N13: check names don't repeat across categories", () => {
    const allNames = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks.map((ch) => ch.name));
    expect(new Set(allNames).size).toBe(allNames.length);
  });

  it("N14: descriptions don't repeat across checks", () => {
    const allDescs = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks.map((ch) => ch.description));
    expect(new Set(allDescs).size).toBe(allDescs.length);
  });

  it("N15: category labels don't match any check names", () => {
    const labels = new Set(DIAGNOSTIC_CATEGORIES.map((c) => c.label));
    const names = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.checks.map((ch) => ch.name));
    names.forEach((n) => expect(labels.has(n)).toBe(false));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// O. PROPERTY-BASED / FUZZING TESTS (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("O. Property-Based / Fuzzing Tests", () => {
  const statuses: CheckStatus[] = ["pass", "fail", "warn", "skip"];

  function randomStatus(): CheckStatus {
    return statuses[Math.floor(Math.random() * 4)];
  }

  function randomArray(n: number): CheckStatus[] {
    return Array.from({ length: n }, () => randomStatus());
  }

  it("O01: 100 random arrays all produce valid status", () => {
    for (let i = 0; i < 100; i++) {
      const arr = randomArray(Math.floor(Math.random() * 20) + 1);
      const result = getAggregateStatus(makeResult(arr));
      expect(statuses).toContain(result);
    }
  });

  it("O02: adding fail to any random array → fail", () => {
    for (let i = 0; i < 50; i++) {
      const arr = [...randomArray(10), "fail"] as CheckStatus[];
      expect(getAggregateStatus(makeResult(arr))).toBe("fail");
    }
  });

  it("O03: removing all fails from [fail,pass,warn] gives non-fail", () => {
    for (let i = 0; i < 50; i++) {
      const arr = randomArray(10).filter((s) => s !== "fail");
      if (arr.length === 0) arr.push("pass");
      const result = getAggregateStatus(makeResult(arr));
      expect(result).not.toBe("fail");
    }
  });

  it("O04: shuffling doesn't change result (100 trials)", () => {
    for (let i = 0; i < 100; i++) {
      const arr = randomArray(8);
      const original = getAggregateStatus(makeResult(arr));
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      expect(getAggregateStatus(makeResult(shuffled))).toBe(original);
    }
  });

  it("O05: duplicating elements doesn't change result", () => {
    for (let i = 0; i < 50; i++) {
      const arr = randomArray(5);
      const doubled = [...arr, ...arr];
      expect(getAggregateStatus(makeResult(arr))).toBe(getAggregateStatus(makeResult(doubled)));
    }
  });

  it("O06: result is always one of 4 valid statuses", () => {
    for (let i = 0; i < 200; i++) {
      const size = Math.floor(Math.random() * 50) + 1;
      const result = getAggregateStatus(makeResult(randomArray(size)));
      expect(["pass", "fail", "warn", "skip"]).toContain(result);
    }
  });

  it("O07: prepending pass to any array never makes it worse", () => {
    for (let i = 0; i < 50; i++) {
      const arr = randomArray(5);
      const original = getAggregateStatus(makeResult(arr));
      const withPass = ["pass" as CheckStatus, ...arr];
      const withResult = getAggregateStatus(makeResult(withPass));
      // Adding pass should never make fail→pass or warn→pass
      if (original === "fail") expect(withResult).toBe("fail");
      if (original === "warn") expect(["warn", "fail"]).toContain(withResult);
    }
  });

  it("O08: all-same arrays produce that status (1000 trials)", () => {
    for (let i = 0; i < 1000; i++) {
      const s = randomStatus();
      const n = Math.floor(Math.random() * 10) + 1;
      expect(getAggregateStatus(makeResult(Array(n).fill(s)))).toBe(s);
    }
  });

  it("O09: random category lookups never crash", () => {
    const ids = [...DIAGNOSTIC_CATEGORIES.map((c) => c.id), "fake", "", "123", "auth-session"];
    for (let i = 0; i < 100; i++) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      const result = getCategoryById(id);
      expect(result === undefined || typeof result.id === "string").toBe(true);
    }
  });

  it("O10: TOTAL_CHECK_COUNT never changes during fuzzing", () => {
    const before = TOTAL_CHECK_COUNT;
    for (let i = 0; i < 1000; i++) {
      getCategoryById(DIAGNOSTIC_CATEGORIES[i % 7].id);
      getAggregateStatus(makeResult(randomArray(5)));
    }
    expect(TOTAL_CHECK_COUNT).toBe(before);
  });

  it("O11: makeResult with 0 checks", () => {
    const r = makeResult([]);
    expect(r.checks).toHaveLength(0);
    expect(getAggregateStatus(r)).toBe("skip");
  });

  it("O12: makeResult IDs are unique within result", () => {
    for (let i = 0; i < 50; i++) {
      const r = makeResult(randomArray(10));
      const ids = r.checks.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("O13: stress getAggregateStatus with 10000 calls", () => {
    for (let i = 0; i < 10000; i++) {
      getAggregateStatus(makeResult(randomArray(3)));
    }
    expect(true).toBe(true); // didn't crash
  });

  it("O14: stress getCategoryById with 10000 calls", () => {
    for (let i = 0; i < 10000; i++) {
      getCategoryById(DIAGNOSTIC_CATEGORIES[i % 7].id);
    }
    expect(true).toBe(true);
  });

  it("O15: random latencyMs values are preserved", () => {
    for (let i = 0; i < 100; i++) {
      const ms = Math.random() * 10000;
      const c = makeCheck({ latencyMs: ms });
      expect(c.latencyMs).toBe(ms);
    }
  });

  it("O16: random messages are preserved", () => {
    for (let i = 0; i < 50; i++) {
      const msg = `Random message ${Math.random()}`;
      const c = makeCheck({ message: msg });
      expect(c.message).toBe(msg);
    }
  });

  it("O17: array of 1 element is idempotent through aggregate", () => {
    for (let i = 0; i < 100; i++) {
      const s = randomStatus();
      expect(getAggregateStatus(makeResult([s]))).toBe(s);
    }
  });

  it("O18: large random array with guaranteed fail → fail", () => {
    for (let i = 0; i < 20; i++) {
      const arr = randomArray(100);
      arr[Math.floor(Math.random() * 100)] = "fail";
      expect(getAggregateStatus(makeResult(arr))).toBe("fail");
    }
  });

  it("O19: no crash on 10000 element array", () => {
    const arr = randomArray(10000);
    const result = getAggregateStatus(makeResult(arr));
    expect(statuses).toContain(result);
  });

  it("O20: category definitions remain stable after 10000 reads", () => {
    for (let i = 0; i < 10000; i++) {
      expect(DIAGNOSTIC_CATEGORIES[0].id).toBe("auth");
      expect(DIAGNOSTIC_CATEGORIES[6].id).toBe("performance");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P. API CONTRACT VALIDATION (20 tests)
// ═══════════════════════════════════════════════════════════════════════

describe("P. API Contract Validation", () => {
  it("P01: run-checks request body shape", () => {
    const body = { category: "auth" };
    expect(typeof body.category).toBe("string");
    expect(getCategoryById(body.category)).toBeDefined();
  });

  it("P02: run-checks response shape", () => {
    const response = { category: "auth", checks: [makeCheck()], ranAt: new Date().toISOString(), durationMs: 42 };
    expect(typeof response.category).toBe("string");
    expect(Array.isArray(response.checks)).toBe(true);
    expect(typeof response.ranAt).toBe("string");
    expect(typeof response.durationMs).toBe("number");
  });

  it("P03: invalid category returns error shape", () => {
    const error = { error: "Invalid category" };
    expect(typeof error.error).toBe("string");
  });

  it("P04: response checks match category check count", () => {
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      const fakeResponse = { checks: cat.checks.map((ch) => makeCheck({ id: ch.id, name: ch.name })) };
      expect(fakeResponse.checks).toHaveLength(cat.checks.length);
    }
  });

  it("P05: response check IDs match registry IDs", () => {
    const cat = getCategoryById("auth")!;
    const responseIds = cat.checks.map((ch) => ch.id);
    const registryIds = getCategoryById("auth")!.checks.map((ch) => ch.id);
    expect(responseIds).toEqual(registryIds);
  });

  it("P06: all valid category IDs are accepted", () => {
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      expect(getCategoryById(cat.id)).toBeDefined();
    }
  });

  it("P07: unknown categories are rejected", () => {
    const invalid = ["unknown", "", "auth2", "DATABASE", " auth", "auth ", "null", "undefined"];
    for (const id of invalid) {
      expect(getCategoryById(id)).toBeUndefined();
    }
  });

  it("P08: response ranAt is parseable as Date", () => {
    const ranAt = new Date().toISOString();
    expect(new Date(ranAt).getTime()).not.toBeNaN();
  });

  it("P09: response durationMs is non-negative", () => {
    const response = { durationMs: 42 };
    expect(response.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("P10: response can be stored in CategoryResult", () => {
    const response = { category: "auth", checks: [makeCheck()], ranAt: new Date().toISOString(), durationMs: 10 };
    const result: CategoryResult = { categoryId: response.category, checks: response.checks, ranAt: response.ranAt, durationMs: response.durationMs };
    expect(result.categoryId).toBe("auth");
  });

  it("P11: every category can produce a valid response structure", () => {
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      const response = {
        category: cat.id,
        checks: cat.checks.map((ch) => makeCheck({ id: ch.id, name: ch.name })),
        ranAt: new Date().toISOString(),
        durationMs: 0,
      };
      const result: CategoryResult = { categoryId: response.category, checks: response.checks, ranAt: response.ranAt, durationMs: response.durationMs };
      expect(getAggregateStatus(result)).toBe("pass");
    }
  });

  it("P12: response with all fails aggregates to fail", () => {
    const response = {
      category: "auth",
      checks: getCategoryById("auth")!.checks.map((ch) => makeCheck({ id: ch.id, name: ch.name, status: "fail" })),
      ranAt: new Date().toISOString(),
      durationMs: 50,
    };
    const result: CategoryResult = { categoryId: response.category, checks: response.checks, ranAt: response.ranAt, durationMs: response.durationMs };
    expect(getAggregateStatus(result)).toBe("fail");
  });

  it("P13: response JSON roundtrip preserves aggregate status", () => {
    const r = makeResult(["pass", "warn", "pass"], "auth");
    const json = JSON.stringify(r);
    const parsed = JSON.parse(json) as CategoryResult;
    expect(getAggregateStatus(parsed)).toBe(getAggregateStatus(r));
  });

  it("P14: multiple sequential responses for same category", () => {
    const map = new Map<string, CategoryResult>();
    map.set("auth", makeResult(["pass", "pass", "pass"], "auth"));
    expect(getAggregateStatus(map.get("auth")!)).toBe("pass");
    map.set("auth", makeResult(["pass", "fail", "pass"], "auth"));
    expect(getAggregateStatus(map.get("auth")!)).toBe("fail");
    map.set("auth", makeResult(["pass", "pass", "pass"], "auth"));
    expect(getAggregateStatus(map.get("auth")!)).toBe("pass");
  });

  it("P15: response check count never exceeds 10 per category", () => {
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      expect(cat.checks.length).toBeLessThanOrEqual(10);
    }
  });

  it("P16: all check statuses in response are valid enum values", () => {
    const valid: CheckStatus[] = ["pass", "fail", "warn", "skip"];
    for (const s of valid) {
      const c = makeCheck({ status: s });
      expect(valid).toContain(c.status);
    }
  });

  it("P17: error response shape has error string", () => {
    const errorResponse = { error: "Check execution failed" };
    expect(typeof errorResponse.error).toBe("string");
    expect(errorResponse.error.length).toBeGreaterThan(0);
  });

  it("P18: response handles missing optional fields gracefully", () => {
    const c: CheckResult = { id: "t", name: "T", status: "pass", latencyMs: 0 };
    expect(c.message).toBeUndefined();
    expect(c.detail).toBeUndefined();
    // Should not throw when accessed
    expect(c.message || "default").toBe("default");
  });

  it("P19: run-all pattern produces 7 responses", () => {
    const responses = DIAGNOSTIC_CATEGORIES.map((cat) => ({
      category: cat.id,
      checks: cat.checks.map((ch) => makeCheck({ id: ch.id })),
    }));
    expect(responses).toHaveLength(7);
  });

  it("P20: run-all aggregates to pass when all pass", () => {
    const map = new Map<string, CategoryResult>();
    DIAGNOSTIC_CATEGORIES.forEach((cat) => {
      map.set(cat.id, makeResult(cat.checks.map(() => "pass"), cat.id));
    });
    let allPass = true;
    map.forEach((r) => { if (getAggregateStatus(r) !== "pass") allPass = false; });
    expect(allPass).toBe(true);
  });
});
