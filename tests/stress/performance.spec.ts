import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Performance & stress test suite for ListBlitz API                  */
/*  Tests response times, concurrent load, pagination, batch ops       */
/* ------------------------------------------------------------------ */

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";

let SESSION_COOKIE = "";

function authHeaders() {
  return { Cookie: `session_token=${SESSION_COOKIE}` };
}

/** Measure response time of a request */
async function timed(fn: () => Promise<unknown>): Promise<number> {
  const start = performance.now();
  await fn();
  return Math.round(performance.now() - start);
}

/* ------------------------------------------------------------------ */
/*  Setup                                                              */
/* ------------------------------------------------------------------ */

test.beforeAll(async ({ request }) => {
  await request.get(`${BASE}/api/auth/seed`);
  const loginRes = await request.post(`${BASE}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  expect(loginRes.ok()).toBeTruthy();
  const cookies = loginRes.headers()["set-cookie"] || "";
  const match = cookies.match(/session_token=([^;]+)/);
  expect(match).toBeTruthy();
  SESSION_COOKIE = match![1];
});

/* ================================================================== */
/*  1. API Response Time Benchmarks                                    */
/* ================================================================== */

test.describe("P01 — API Response Time Benchmarks", () => {
  test("P01.01 GET /api/listings responds under 500ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/listings`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(500);
  });

  test("P01.02 GET /api/analytics responds under 800ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/analytics`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(800);
  });

  test("P01.03 GET /api/sales?stats=true responds under 500ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/sales?stats=true`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(500);
  });

  test("P01.04 GET /api/ops/summary responds under 600ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/ops/summary`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(600);
  });

  test("P01.05 GET /api/templates responds under 300ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/templates`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(300);
  });

  test("P01.06 GET /api/scheduler responds under 300ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/scheduler`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(300);
  });

  test("P01.07 GET /api/inbox responds under 500ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/inbox`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(500);
  });

  test("P01.08 GET /api/offers responds under 400ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/offers`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(400);
  });

  test("P01.09 GET /api/repricing responds under 600ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/repricing`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(600);
  });

  test("P01.10 GET /api/health-check responds under 800ms (no auth)", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/health-check`)
    );
    expect(ms).toBeLessThan(800);
  });

  test("P01.11 POST /api/auth/login responds under 400ms", async ({ request }) => {
    const ms = await timed(() =>
      request.post(`${BASE}/api/auth/login`, {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
      })
    );
    expect(ms).toBeLessThan(400);
  });

  test("P01.12 GET /api/auth/me responds under 200ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/auth/me`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(200);
  });
});

/* ================================================================== */
/*  2. Pagination & Bounded Queries                                    */
/* ================================================================== */

test.describe("P02 — Pagination & Bounded Queries", () => {
  test("P02.01 listings GET supports limit parameter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?limit=5`, { headers: authHeaders() });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("listings");
    expect(data.listings.length).toBeLessThanOrEqual(5);
  });

  test("P02.02 listings GET supports offset parameter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?limit=2&offset=0`, { headers: authHeaders() });
    expect(res.ok()).toBeTruthy();
    const page1 = await res.json();

    const res2 = await request.get(`${BASE}/api/listings?limit=2&offset=2`, { headers: authHeaders() });
    const page2 = await res2.json();

    // Pages should be different (if enough data) or at least both valid
    expect(page1.listings).toBeDefined();
    expect(page2.listings).toBeDefined();
    expect(page1.offset).toBe(0);
    expect(page2.offset).toBe(2);
  });

  test("P02.03 listings GET caps limit at 500", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?limit=9999`, { headers: authHeaders() });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.limit).toBeLessThanOrEqual(500);
  });

  test("P02.04 listings GET filters by status", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?status=draft&limit=10`, { headers: authHeaders() });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    for (const listing of data.listings) {
      expect(listing.status).toBe("draft");
    }
  });
});

/* ================================================================== */
/*  3. Bulk Import Performance                                         */
/* ================================================================== */

test.describe("P03 — Bulk Import Performance", () => {
  test("P03.01 import 50 rows completes under 3s", async ({ request }) => {
    const rows = ["title,description,category,brand,size,condition,price,costprice"];
    for (let i = 0; i < 50; i++) {
      rows.push(`"Perf Test Item ${i}","Test description ${i}",Other,TestBrand,M,Good,${10 + i},${5 + i}`);
    }

    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/bulk-import`, {
        headers: { ...authHeaders(), "Content-Type": "text/csv" },
        data: rows.join("\n"),
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.imported).toBe(50);
    });
    expect(ms).toBeLessThan(3000);
  });

  test("P03.02 import 200 rows completes under 8s", async ({ request }) => {
    const rows = ["title,description,category,brand,size,condition,price,costprice"];
    for (let i = 0; i < 200; i++) {
      rows.push(`"Bulk Item ${i}","Bulk description",Other,BulkBrand,L,Good,${20 + i},${10 + i}`);
    }

    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/bulk-import`, {
        headers: { ...authHeaders(), "Content-Type": "text/csv" },
        data: rows.join("\n"),
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.imported).toBe(200);
    });
    expect(ms).toBeLessThan(8000);
  });

  test("P03.03 import with invalid rows returns errors without crashing", async ({ request }) => {
    const csv = [
      "title,description,category,brand,size,condition,price,costprice",
      ",missing title,Other,,,,10,5",
      "Valid Item,description,Other,,,Good,25,10",
      "No Price,description,Other,,,Good,,",
      "Bad Price,description,Other,,,Good,abc,5",
    ].join("\n");

    const res = await request.post(`${BASE}/api/bulk-import`, {
      headers: { ...authHeaders(), "Content-Type": "text/csv" },
      data: csv,
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.imported).toBe(1);
    expect(data.errors.length).toBe(3);
  });
});

/* ================================================================== */
/*  4. Batch Operations Performance                                    */
/* ================================================================== */

test.describe("P04 — Batch Operations Performance", () => {
  let testListingIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // Create test listings for batch ops
    const csv = ["title,description,category,brand,size,condition,price,costprice"];
    for (let i = 0; i < 20; i++) {
      csv.push(`"Batch Test ${i}","Batch desc",Other,,,Good,15,8`);
    }
    await request.post(`${BASE}/api/bulk-import`, {
      headers: { ...authHeaders(), "Content-Type": "text/csv" },
      data: csv.join("\n"),
    });

    const listRes = await request.get(`${BASE}/api/listings?limit=20`, { headers: authHeaders() });
    const listData = await listRes.json();
    testListingIds = listData.listings.slice(0, 20).map((l: { id: string }) => l.id);
  });

  test("P04.01 batch activate 20 listings under 500ms", async ({ request }) => {
    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/batch`, {
        headers: authHeaders(),
        data: { action: "activate", listingIds: testListingIds },
      });
      expect(res.ok()).toBeTruthy();
    });
    expect(ms).toBeLessThan(500);
  });

  test("P04.02 batch deactivate 20 listings under 500ms", async ({ request }) => {
    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/batch`, {
        headers: authHeaders(),
        data: { action: "deactivate", listingIds: testListingIds },
      });
      expect(res.ok()).toBeTruthy();
    });
    expect(ms).toBeLessThan(500);
  });

  test("P04.03 batch duplicate 10 listings under 2s", async ({ request }) => {
    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/batch`, {
        headers: authHeaders(),
        data: { action: "duplicate", listingIds: testListingIds.slice(0, 10) },
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.updated).toBe(10);
    });
    expect(ms).toBeLessThan(2000);
  });

  test("P04.04 batch delete 10 listings under 500ms", async ({ request }) => {
    // Get some expendable IDs
    const listRes = await request.get(`${BASE}/api/listings?limit=10&status=draft`, { headers: authHeaders() });
    const data = await listRes.json();
    const ids = data.listings.slice(0, 10).map((l: { id: string }) => l.id);
    if (ids.length === 0) return;

    const ms = await timed(async () => {
      const res = await request.post(`${BASE}/api/batch`, {
        headers: authHeaders(),
        data: { action: "delete", listingIds: ids },
      });
      expect(res.ok()).toBeTruthy();
    });
    expect(ms).toBeLessThan(500);
  });
});

/* ================================================================== */
/*  5. Concurrent Request Handling                                     */
/* ================================================================== */

test.describe("P05 — Concurrent Request Handling", () => {
  test("P05.01 10 concurrent GET /api/listings all succeed under 2s", async ({ request }) => {
    const ms = await timed(async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request.get(`${BASE}/api/listings?limit=10`, { headers: authHeaders() })
        )
      );
      for (const res of results) {
        expect(res.ok()).toBeTruthy();
      }
    });
    expect(ms).toBeLessThan(2000);
  });

  test("P05.02 10 concurrent GET /api/analytics all succeed under 3s", async ({ request }) => {
    const ms = await timed(async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request.get(`${BASE}/api/analytics`, { headers: authHeaders() })
        )
      );
      for (const res of results) {
        expect(res.ok()).toBeTruthy();
      }
    });
    expect(ms).toBeLessThan(3000);
  });

  test("P05.03 10 concurrent GET /api/sales all succeed under 2s", async ({ request }) => {
    const ms = await timed(async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request.get(`${BASE}/api/sales`, { headers: authHeaders() })
        )
      );
      for (const res of results) {
        expect(res.ok()).toBeTruthy();
      }
    });
    expect(ms).toBeLessThan(2000);
  });

  test("P05.04 mixed concurrent reads (listings + analytics + sales + ops)", async ({ request }) => {
    const ms = await timed(async () => {
      const results = await Promise.all([
        request.get(`${BASE}/api/listings?limit=10`, { headers: authHeaders() }),
        request.get(`${BASE}/api/analytics`, { headers: authHeaders() }),
        request.get(`${BASE}/api/sales?stats=true`, { headers: authHeaders() }),
        request.get(`${BASE}/api/ops/summary`, { headers: authHeaders() }),
        request.get(`${BASE}/api/templates`, { headers: authHeaders() }),
        request.get(`${BASE}/api/scheduler`, { headers: authHeaders() }),
        request.get(`${BASE}/api/inbox`, { headers: authHeaders() }),
        request.get(`${BASE}/api/offers`, { headers: authHeaders() }),
      ]);
      for (const res of results) {
        expect(res.ok()).toBeTruthy();
      }
    });
    expect(ms).toBeLessThan(3000);
  });

  test("P05.05 20 concurrent auth checks all succeed", async ({ request }) => {
    const ms = await timed(async () => {
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          request.get(`${BASE}/api/auth/me`, { headers: authHeaders() })
        )
      );
      for (const res of results) {
        expect(res.ok()).toBeTruthy();
      }
    });
    expect(ms).toBeLessThan(2000);
  });
});

/* ================================================================== */
/*  6. Create + Read + Update + Delete Lifecycle                       */
/* ================================================================== */

test.describe("P06 — CRUD Lifecycle Performance", () => {
  test("P06.01 full listing lifecycle under 3s", async ({ request }) => {
    const ms = await timed(async () => {
      // Create
      const form = new FormData();
      form.append("title", "Perf Lifecycle Test");
      form.append("description", "Performance test item for lifecycle benchmarking");
      form.append("category", "Other");
      form.append("price", "50");
      const createRes = await request.post(`${BASE}/api/listings`, {
        headers: authHeaders(),
        multipart: {
          title: "Perf Lifecycle Test",
          description: "Performance test item",
          category: "Other",
          price: "50",
        },
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();
      const id = created.id;

      // Read
      const readRes = await request.get(`${BASE}/api/listings/${id}`, { headers: authHeaders() });
      expect(readRes.ok()).toBeTruthy();

      // Update
      const updateRes = await request.patch(`${BASE}/api/listings/${id}`, {
        headers: authHeaders(),
        data: { title: "Updated Perf Test", price: 60 },
      });
      expect(updateRes.ok()).toBeTruthy();

      // Delete
      const deleteRes = await request.delete(`${BASE}/api/listings/${id}`, { headers: authHeaders() });
      expect(deleteRes.ok()).toBeTruthy();
    });
    expect(ms).toBeLessThan(3000);
  });

  test("P06.02 sale record + stats retrieval under 1s", async ({ request }) => {
    const ms = await timed(async () => {
      const createRes = await request.post(`${BASE}/api/sales`, {
        headers: authHeaders(),
        data: {
          platform: "ebay",
          title: "Perf Test Sale",
          soldPrice: 100,
          costPrice: 40,
          shippingCost: 10,
          platformFee: 13,
        },
      });
      expect(createRes.status()).toBe(201);
      const sale = await createRes.json();

      const statsRes = await request.get(`${BASE}/api/sales?stats=true`, { headers: authHeaders() });
      expect(statsRes.ok()).toBeTruthy();
      const stats = await statsRes.json();
      expect(stats.stats.count).toBeGreaterThan(0);

      await request.delete(`${BASE}/api/sales?id=${sale.id}`, { headers: authHeaders() });
    });
    expect(ms).toBeLessThan(1000);
  });
});

/* ================================================================== */
/*  7. Payload Size & Response Shape                                   */
/* ================================================================== */

test.describe("P07 — Payload Size Validation", () => {
  test("P07.01 listings response includes images and platformListings", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?limit=5`, { headers: authHeaders() });
    const data = await res.json();
    expect(data.listings).toBeDefined();
    expect(Array.isArray(data.listings)).toBe(true);
    if (data.listings.length > 0) {
      const listing = data.listings[0];
      expect(listing).toHaveProperty("images");
      expect(listing).toHaveProperty("platformListings");
    }
  });

  test("P07.02 sales stats includes monthly and platform breakdowns", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sales?stats=true`, { headers: authHeaders() });
    const data = await res.json();
    expect(data).toHaveProperty("stats");
    expect(data.stats).toHaveProperty("totalRevenue");
    expect(data.stats).toHaveProperty("totalProfit");
    expect(data.stats).toHaveProperty("monthlyBreakdown");
    expect(data.stats).toHaveProperty("platformBreakdown");
  });

  test("P07.03 analytics returns all 8 platforms", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics`, { headers: authHeaders() });
    const data = await res.json();
    expect(data.platformStats).toHaveLength(8);
    const platforms = data.platformStats.map((p: { platform: string }) => p.platform);
    expect(platforms).toContain("depop");
    expect(platforms).toContain("grailed");
    expect(platforms).toContain("ebay");
  });

  test("P07.04 ops summary has correct shape", async ({ request }) => {
    const res = await request.get(`${BASE}/api/ops/summary`, { headers: authHeaders() });
    const data = await res.json();
    expect(data).toHaveProperty("listings");
    expect(data).toHaveProperty("system");
    expect(data.system).toHaveProperty("memory");
    expect(data.system).toHaveProperty("db");
  });
});

/* ================================================================== */
/*  8. Error Handling Under Load                                       */
/* ================================================================== */

test.describe("P08 — Error Handling Under Load", () => {
  test("P08.01 invalid bulk import doesn't crash server", async ({ request }) => {
    const res = await request.post(`${BASE}/api/bulk-import`, {
      headers: { ...authHeaders(), "Content-Type": "text/csv" },
      data: "this is not csv at all\nrandom garbage\nmore garbage",
    });
    // Should return 200 with errors, not crash
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.imported).toBe(0);
  });

  test("P08.02 batch with empty listingIds returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/batch`, {
      headers: authHeaders(),
      data: { action: "activate", listingIds: [] },
    });
    expect(res.status()).toBe(400);
  });

  test("P08.03 batch with nonexistent IDs doesn't crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/batch`, {
      headers: authHeaders(),
      data: { action: "activate", listingIds: ["nonexistent-id-1", "nonexistent-id-2"] },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.updated).toBe(0);
  });

  test("P08.04 GET nonexistent listing returns 404", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings/nonexistent-uuid`, { headers: authHeaders() });
    expect(res.status()).toBe(404);
  });

  test("P08.05 unauthenticated requests get redirected", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings`, { maxRedirects: 0 });
    expect([307, 308]).toContain(res.status());
  });

  test("P08.06 10 concurrent invalid logins don't crash", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request.post(`${BASE}/api/auth/login`, {
          data: { email: "fake@test.com", password: "wrong" },
        })
      )
    );
    for (const res of results) {
      expect(res.status()).toBe(401);
    }
  });
});

/* ================================================================== */
/*  9. Database Index Verification                                     */
/* ================================================================== */

test.describe("P09 — Query Performance with Indexes", () => {
  test("P09.01 filtered listing query (status=draft) responds under 300ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/listings?status=draft&limit=50`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(300);
  });

  test("P09.02 filtered listing query (status=active) responds under 300ms", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/listings?status=active&limit=50`, { headers: authHeaders() })
    );
    expect(ms).toBeLessThan(300);
  });

  test("P09.03 sales endpoint responds consistently under repeated calls", async ({ request }) => {
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const ms = await timed(() =>
        request.get(`${BASE}/api/sales?stats=true`, { headers: authHeaders() })
      );
      times.push(ms);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    // Average should be under 500ms, no single call over 1s
    expect(avg).toBeLessThan(500);
    expect(maxTime).toBeLessThan(1000);
  });
});

/* ================================================================== */
/*  10. Sustained Load Test                                            */
/* ================================================================== */

test.describe("P10 — Sustained Load", () => {
  test("P10.01 50 sequential requests maintain sub-500ms response", async ({ request }) => {
    const times: number[] = [];
    for (let i = 0; i < 50; i++) {
      const ms = await timed(() =>
        request.get(`${BASE}/api/listings?limit=5`, { headers: authHeaders() })
      );
      times.push(ms);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
    expect(avg).toBeLessThan(500);
    expect(p95).toBeLessThan(800);
  });

  test("P10.02 rapid create-delete cycle (20 iterations)", async ({ request }) => {
    const ms = await timed(async () => {
      for (let i = 0; i < 20; i++) {
        const createRes = await request.post(`${BASE}/api/listings`, {
          headers: authHeaders(),
          multipart: {
            title: `Rapid Test ${i}`,
            description: "Rapid create-delete test",
            category: "Other",
            price: "25",
          },
        });
        expect(createRes.status()).toBe(201);
        const { id } = await createRes.json();
        const delRes = await request.delete(`${BASE}/api/listings/${id}`, { headers: authHeaders() });
        expect(delRes.ok()).toBeTruthy();
      }
    });
    // 20 create+delete cycles should complete within 15s
    expect(ms).toBeLessThan(15000);
  });
});
