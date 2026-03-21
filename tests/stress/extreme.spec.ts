import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  EXTREME LOAD — x5, x10, x100 multipliers                          */
/*  Goal: find the absolute breaking point                             */
/* ------------------------------------------------------------------ */

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";
let SESSION_COOKIE = "";

function auth() {
  return { Cookie: `session_token=${SESSION_COOKIE}` };
}

async function timed(fn: () => Promise<unknown>): Promise<number> {
  const start = performance.now();
  await fn();
  return Math.round(performance.now() - start);
}

/** Fire N concurrent requests, return pass/fail counts */
async function flood(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  n: number,
  fn: (i: number) => Promise<{ ok: () => boolean; status: () => number }>
) {
  const results = await Promise.all(Array.from({ length: n }, (_, i) => fn(i)));
  const ok = results.filter((r) => r.ok()).length;
  const serverErrors = results.filter((r) => r.status() >= 500).length;
  return { ok, serverErrors, total: n };
}

test.setTimeout(300_000); // 5 min per test

test.beforeAll(async ({ request }) => {
  await request.get(`${BASE}/api/auth/seed`);
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  SESSION_COOKIE = (res.headers()["set-cookie"] || "").match(/session_token=([^;]+)/)?.[1] || "";
  expect(SESSION_COOKIE).toBeTruthy();
});

/* ================================================================== */
/*  X5 — 5x the previous crash test levels                             */
/* ================================================================== */

test.describe("X5 — Five Times Load", () => {
  test("X5.01 import 2500 rows", async ({ request }) => {
    const rows = ["title,description,category,price"];
    for (let i = 0; i < 2500; i++) {
      rows.push(`"X5 Item ${i}","Five times load test item ${i}",Other,${10 + (i % 90)}`);
    }
    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/bulk-import`, {
        headers: { ...auth(), "Content-Type": "text/csv" },
        data: rows.join("\n"),
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.imported).toBe(2500);
    });
    console.log(`  X5.01 2500-row import: ${ms}ms`);
  });

  test("X5.02 250 concurrent listing creates", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 250, (i) =>
      request.post(`${BASE}/api/listings`, {
        headers: auth(),
        multipart: {
          title: `X5 Create ${i}`,
          description: `X5 concurrent create test ${i}`,
          category: "Other",
          price: String(10 + (i % 50)),
        },
      })
    );
    console.log(`  X5.02 250 concurrent creates: ${ok} ok, ${serverErrors} server errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(250);
  });

  test("X5.03 250 concurrent reads", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 250, () =>
      request.get(`${BASE}/api/listings?limit=10`, { headers: auth() })
    );
    console.log(`  X5.03 250 concurrent reads: ${ok} ok, ${serverErrors} server errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(250);
  });

  test("X5.04 150 concurrent sale records", async ({ request }) => {
    const platforms = ["depop", "grailed", "ebay", "mercari", "poshmark", "vinted", "facebook", "vestiaire"];
    const { ok, serverErrors } = await flood(request, 150, (i) =>
      request.post(`${BASE}/api/sales`, {
        headers: auth(),
        data: {
          platform: platforms[i % 8],
          title: `X5 Sale ${i}`,
          soldPrice: 30 + (i % 70),
          costPrice: 10 + (i % 30),
          shippingCost: 5,
          platformFee: 3,
        },
      })
    );
    console.log(`  X5.04 150 concurrent sales: ${ok} ok, ${serverErrors} server errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(150);
  });

  test("X5.05 500 concurrent mixed reads", async ({ request }) => {
    const endpoints = [
      "/api/listings?limit=5",
      "/api/analytics",
      "/api/sales",
      "/api/ops/summary",
      "/api/templates",
      "/api/scheduler",
      "/api/inbox",
      "/api/offers",
      "/api/repricing",
      "/api/auth/me",
    ];
    const { ok, serverErrors } = await flood(request, 500, (i) =>
      request.get(`${BASE}${endpoints[i % endpoints.length]}`, { headers: auth() })
    );
    console.log(`  X5.05 500 concurrent mixed: ${ok} ok, ${serverErrors} server errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(500);
  });

  test("X5.06 500 concurrent auth checks", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 500, () =>
      request.get(`${BASE}/api/auth/me`, { headers: auth() })
    );
    console.log(`  X5.06 500 concurrent auth: ${ok} ok, ${serverErrors} server errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(500);
  });

  test("X5.07 batch duplicate 500 listings", async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/listings?limit=500`, { headers: auth() });
    const data = await listRes.json();
    const ids = data.listings.map((l: { id: string }) => l.id);
    if (ids.length < 10) return;

    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/batch`, {
        headers: auth(),
        data: { action: "duplicate", listingIds: ids },
      });
      expect(res.ok()).toBeTruthy();
    });
    console.log(`  X5.07 batch dup ${ids.length}: ${ms}ms`);
  });
});

/* ================================================================== */
/*  X10 — 10x load                                                     */
/* ================================================================== */

test.describe("X10 — Ten Times Load", () => {
  test("X10.01 import 5000 rows", async ({ request }) => {
    const rows = ["title,description,category,price"];
    for (let i = 0; i < 5000; i++) {
      rows.push(`"X10 Item ${i}","Ten times load test ${i}",Other,${10 + (i % 90)}`);
    }
    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/bulk-import`, {
        headers: { ...auth(), "Content-Type": "text/csv" },
        data: rows.join("\n"),
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.imported).toBe(5000);
    });
    console.log(`  X10.01 5000-row import: ${ms}ms`);
  });

  test("X10.02 500 concurrent listing creates", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 500, (i) =>
      request.post(`${BASE}/api/listings`, {
        headers: auth(),
        multipart: {
          title: `X10 Create ${i}`,
          description: `X10 concurrent stress ${i}`,
          category: "Other",
          price: String(10 + (i % 50)),
        },
      })
    );
    console.log(`  X10.02 500 concurrent creates: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(500);
  });

  test("X10.03 500 concurrent reads on heavy dataset", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 500, () =>
      request.get(`${BASE}/api/listings?limit=50`, { headers: auth() })
    );
    console.log(`  X10.03 500 concurrent reads: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(500);
  });

  test("X10.04 1000 concurrent auth checks", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 1000, () =>
      request.get(`${BASE}/api/auth/me`, { headers: auth() })
    );
    console.log(`  X10.04 1000 concurrent auth: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(1000);
  });

  test("X10.05 1000 concurrent mixed reads", async ({ request }) => {
    const endpoints = [
      "/api/listings?limit=5",
      "/api/analytics",
      "/api/sales",
      "/api/ops/summary",
      "/api/auth/me",
    ];
    const { ok, serverErrors } = await flood(request, 1000, (i) =>
      request.get(`${BASE}${endpoints[i % endpoints.length]}`, { headers: auth() })
    );
    console.log(`  X10.05 1000 concurrent mixed: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
  });

  test("X10.06 300 concurrent sale records", async ({ request }) => {
    const platforms = ["depop", "grailed", "ebay", "mercari", "poshmark"];
    const { ok, serverErrors } = await flood(request, 300, (i) =>
      request.post(`${BASE}/api/sales`, {
        headers: auth(),
        data: {
          platform: platforms[i % 5],
          title: `X10 Sale ${i}`,
          soldPrice: 25 + (i % 75),
          costPrice: 10,
          shippingCost: 5,
          platformFee: 3,
        },
      })
    );
    console.log(`  X10.06 300 concurrent sales: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
    expect(ok).toBe(300);
  });

  test("X10.07 500 rapid create-delete cycles", async ({ request }) => {
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < 500; i++) {
      const res = await request.post(`${BASE}/api/listings`, {
        headers: auth(),
        multipart: { title: `X10 Rapid ${i}`, description: "x10", category: "Other", price: "15" },
      });
      if (res.status() === 201) {
        const { id } = await res.json();
        await request.delete(`${BASE}/api/listings/${id}`, { headers: auth() });
        ok++;
      } else {
        fail++;
      }
    }
    console.log(`  X10.07 500 create-delete: ${ok} ok, ${fail} fail`);
    expect(ok).toBe(500);
  });

  test("X10.08 250 concurrent writes + 250 concurrent reads", async ({ request }) => {
    const writes = Array.from({ length: 250 }, (_, i) =>
      request.post(`${BASE}/api/listings`, {
        headers: auth(),
        multipart: { title: `X10 RW ${i}`, description: "rw", category: "Other", price: "20" },
      })
    );
    const reads = Array.from({ length: 250 }, () =>
      request.get(`${BASE}/api/listings?limit=5`, { headers: auth() })
    );
    const results = await Promise.all([...writes, ...reads]);
    const writeOk = results.slice(0, 250).filter((r) => r.status() === 201).length;
    const readOk = results.slice(250).filter((r) => r.ok()).length;
    const serverErrors = results.filter((r) => r.status() >= 500).length;
    console.log(`  X10.08 250w+250r: ${writeOk} writes, ${readOk} reads, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
  });
});

/* ================================================================== */
/*  X100 — 100x load — absolute breaking point                        */
/* ================================================================== */

test.describe("X100 — Hundred Times Load", () => {
  test("X100.01 import 10000 rows", async ({ request }) => {
    const rows = ["title,description,category,price"];
    for (let i = 0; i < 10000; i++) {
      rows.push(`"X100 Item ${i}","Extreme load test ${i}",Other,${10 + (i % 90)}`);
    }
    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/bulk-import`, {
        headers: { ...auth(), "Content-Type": "text/csv" },
        data: rows.join("\n"),
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.imported).toBe(10000);
    });
    console.log(`  X100.01 10000-row import: ${ms}ms`);
  });

  test("X100.02 1000 concurrent listing creates", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 1000, (i) =>
      request.post(`${BASE}/api/listings`, {
        headers: auth(),
        multipart: {
          title: `X100 Create ${i}`,
          description: `Extreme concurrency ${i}`,
          category: "Other",
          price: String(10 + (i % 50)),
        },
      })
    );
    console.log(`  X100.02 1000 concurrent creates: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
  });

  test("X100.03 2000 concurrent reads", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 2000, () =>
      request.get(`${BASE}/api/listings?limit=5`, { headers: auth() })
    );
    console.log(`  X100.03 2000 concurrent reads: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
  });

  test("X100.04 5000 concurrent auth checks", async ({ request }) => {
    const { ok, serverErrors } = await flood(request, 5000, () =>
      request.get(`${BASE}/api/auth/me`, { headers: auth() })
    );
    console.log(`  X100.04 5000 concurrent auth: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
  });

  test("X100.05 2000 concurrent mixed reads", async ({ request }) => {
    const endpoints = [
      "/api/listings?limit=5",
      "/api/analytics",
      "/api/sales",
      "/api/ops/summary",
      "/api/auth/me",
      "/api/templates",
      "/api/scheduler",
      "/api/inbox",
      "/api/offers",
      "/api/repricing",
    ];
    const { ok, serverErrors } = await flood(request, 2000, (i) =>
      request.get(`${BASE}${endpoints[i % endpoints.length]}`, { headers: auth() })
    );
    console.log(`  X100.05 2000 mixed reads: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
  });

  test("X100.06 500 concurrent writes + 500 concurrent reads", async ({ request }) => {
    const writes = Array.from({ length: 500 }, (_, i) =>
      request.post(`${BASE}/api/listings`, {
        headers: auth(),
        multipart: { title: `X100 RW ${i}`, description: "extreme", category: "Other", price: "20" },
      })
    );
    const reads = Array.from({ length: 500 }, () =>
      request.get(`${BASE}/api/listings?limit=5`, { headers: auth() })
    );
    const results = await Promise.all([...writes, ...reads]);
    const serverErrors = results.filter((r) => r.status() >= 500).length;
    const writeOk = results.slice(0, 500).filter((r) => r.status() === 201).length;
    const readOk = results.slice(500).filter((r) => r.ok()).length;
    console.log(`  X100.06 500w+500r: ${writeOk} writes, ${readOk} reads, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
  });

  test("X100.07 1000 concurrent sale records", async ({ request }) => {
    const platforms = ["depop", "grailed", "ebay", "mercari", "poshmark", "vinted", "facebook", "vestiaire"];
    const { ok, serverErrors } = await flood(request, 1000, (i) =>
      request.post(`${BASE}/api/sales`, {
        headers: auth(),
        data: {
          platform: platforms[i % 8],
          title: `X100 Sale ${i}`,
          soldPrice: 20 + (i % 80),
          costPrice: 8,
          shippingCost: 5,
          platformFee: 2,
        },
      })
    );
    console.log(`  X100.07 1000 concurrent sales: ${ok} ok, ${serverErrors} errors`);
    expect(serverErrors).toBe(0);
  });

  test("X100.08 batch activate all listings", async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/listings?limit=500`, { headers: auth() });
    const data = await listRes.json();
    const ids = data.listings.map((l: { id: string }) => l.id);

    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/batch`, {
        headers: auth(),
        data: { action: "activate", listingIds: ids },
      });
      expect(res.ok()).toBeTruthy();
    });
    console.log(`  X100.08 batch activate ${ids.length}: ${ms}ms`);
  });

  test("X100.09 5MB CSV body", async ({ request }) => {
    const rows = ["title,description,category,price"];
    const desc = "Y".repeat(400);
    // ~450 bytes/row * 11000 rows ≈ 5MB
    for (let i = 0; i < 11000; i++) {
      rows.push(`"5MB Item ${i}","${desc}",Other,${15 + (i % 85)}`);
    }
    const csv = rows.join("\n");
    console.log(`  X100.09 CSV size: ${(csv.length / 1024 / 1024).toFixed(1)}MB`);

    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/bulk-import`, {
        headers: { ...auth(), "Content-Type": "text/csv" },
        data: csv,
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.imported).toBe(11000);
    });
    console.log(`  X100.09 5MB import: ${ms}ms`);
  });
});

/* ================================================================== */
/*  FINAL — Server Alive After Extreme Abuse                           */
/* ================================================================== */

test.describe("FINAL — Server Alive After Extreme Abuse", () => {
  test("FINAL.01 health check responds", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health-check`);
    expect(res.ok()).toBeTruthy();
  });

  test("FINAL.02 can login", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("FINAL.03 can create listing", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: "I Survived x100",
        description: "The server is still standing",
        category: "Other",
        price: "999",
      },
    });
    expect(res.status()).toBe(201);
  });

  test("FINAL.04 can read listings", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?limit=5`, { headers: auth() });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.total).toBeGreaterThan(0);
    console.log(`  FINAL.04 total listings in DB: ${data.total}`);
  });

  test("FINAL.05 analytics still works", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics`, { headers: auth() });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log(`  FINAL.05 total listings: ${data.totalListings}`);
  });

  test("FINAL.06 sales stats still works", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sales?stats=true`, { headers: auth() });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log(`  FINAL.06 total sales: ${data.stats.count}, revenue: $${data.stats.totalRevenue.toFixed(2)}`);
  });

  test("FINAL.07 DB consistency — two reads match", async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.get(`${BASE}/api/listings?limit=1`, { headers: auth() }),
      request.get(`${BASE}/api/listings?limit=1`, { headers: auth() }),
    ]);
    const d1 = await r1.json();
    const d2 = await r2.json();
    expect(d1.total).toBe(d2.total);
  });
});
