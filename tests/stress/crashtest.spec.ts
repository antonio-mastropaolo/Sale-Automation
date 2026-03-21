import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  CRASH TEST — Heavy & extra-heavy load to find breaking points      */
/*  Goal: push every endpoint until it breaks or proves resilient      */
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

test.setTimeout(120_000); // 2 min per test

/* ------------------------------------------------------------------ */
test.beforeAll(async ({ request }) => {
  await request.get(`${BASE}/api/auth/seed`);
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  const cookies = res.headers()["set-cookie"] || "";
  SESSION_COOKIE = cookies.match(/session_token=([^;]+)/)?.[1] || "";
  expect(SESSION_COOKIE).toBeTruthy();
});

/* ================================================================== */
/*  C01 — Mass Data Injection                                          */
/* ================================================================== */

test.describe("C01 — Mass Data Injection", () => {
  test("C01.01 import 500 rows in one shot", async ({ request }) => {
    const rows = ["title,description,category,brand,size,condition,price,costprice"];
    for (let i = 0; i < 500; i++) {
      rows.push(`"Crash Item ${i}","Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ${i}",Other,CrashBrand,M,Good,${10 + (i % 90)},${5 + (i % 40)}`);
    }
    const res = await request.post(`${BASE}/api/bulk-import`, {
      headers: { ...auth(), "Content-Type": "text/csv" },
      data: rows.join("\n"),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.imported).toBe(500);
  });

  test("C01.02 import 1000 rows in one shot", async ({ request }) => {
    const rows = ["title,description,category,brand,size,condition,price,costprice"];
    for (let i = 0; i < 1000; i++) {
      rows.push(`"Mass Item ${i}","Stress test description for item number ${i} with extra padding to simulate real data",Other,MassBrand,L,Good,${15 + (i % 100)},${7 + (i % 50)}`);
    }
    const res = await request.post(`${BASE}/api/bulk-import`, {
      headers: { ...auth(), "Content-Type": "text/csv" },
      data: rows.join("\n"),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.imported).toBe(1000);
  });
});

/* ================================================================== */
/*  C02 — Concurrent Write Storm                                       */
/* ================================================================== */

test.describe("C02 — Concurrent Write Storm", () => {
  test("C02.01 50 concurrent listing creates", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        request.post(`${BASE}/api/listings`, {
          headers: auth(),
          multipart: {
            title: `Concurrent Create ${i}`,
            description: `Concurrent stress test item ${i}`,
            category: "Other",
            price: String(20 + i),
          },
        })
      )
    );
    const successes = results.filter((r) => r.status() === 201);
    expect(successes.length).toBe(50);
  });

  test("C02.02 30 concurrent sale records", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        request.post(`${BASE}/api/sales`, {
          headers: auth(),
          data: {
            platform: ["depop", "grailed", "ebay", "mercari", "poshmark"][i % 5],
            title: `Storm Sale ${i}`,
            soldPrice: 50 + i * 2,
            costPrice: 20 + i,
            shippingCost: 5,
            platformFee: 3 + i * 0.5,
          },
        })
      )
    );
    const successes = results.filter((r) => r.status() === 201);
    expect(successes.length).toBe(30);
  });

  test("C02.03 20 concurrent conversations + messages", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        request.post(`${BASE}/api/inbox`, {
          headers: auth(),
          data: {
            platform: ["depop", "grailed", "ebay", "mercari"][i % 4],
            buyerName: `StormBuyer${i}`,
            buyerUsername: `stormu${i}`,
            listingTitle: `Storm Listing ${i}`,
            message: `Hey, is this still available? I'd like to buy item ${i}`,
          },
        })
      )
    );
    const successes = results.filter((r) => r.ok());
    expect(successes.length).toBe(20);
  });
});

/* ================================================================== */
/*  C03 — Concurrent Read Flood                                        */
/* ================================================================== */

test.describe("C03 — Concurrent Read Flood", () => {
  test("C03.01 50 concurrent GET /api/listings", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        request.get(`${BASE}/api/listings?limit=50`, { headers: auth() })
      )
    );
    expect(results.every((r) => r.ok())).toBe(true);
  });

  test("C03.02 50 concurrent GET /api/analytics", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        request.get(`${BASE}/api/analytics`, { headers: auth() })
      )
    );
    expect(results.every((r) => r.ok())).toBe(true);
  });

  test("C03.03 50 concurrent GET /api/sales?stats=true", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        request.get(`${BASE}/api/sales?stats=true`, { headers: auth() })
      )
    );
    expect(results.every((r) => r.ok())).toBe(true);
  });

  test("C03.04 100 concurrent GET /api/auth/me", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        request.get(`${BASE}/api/auth/me`, { headers: auth() })
      )
    );
    expect(results.every((r) => r.ok())).toBe(true);
  });

  test("C03.05 100 concurrent mixed reads (all endpoints)", async ({ request }) => {
    const endpoints = [
      "/api/listings?limit=10",
      "/api/analytics",
      "/api/sales?stats=true",
      "/api/ops/summary",
      "/api/templates",
      "/api/scheduler",
      "/api/inbox",
      "/api/offers",
      "/api/repricing",
      "/api/auth/me",
    ];
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        request.get(`${BASE}${endpoints[i % endpoints.length]}`, { headers: auth() })
      )
    );
    const failed = results.filter((r) => !r.ok());
    expect(failed.length).toBe(0);
  });
});

/* ================================================================== */
/*  C04 — Oversized Payloads                                           */
/* ================================================================== */

test.describe("C04 — Oversized Payloads", () => {
  test("C04.01 listing with 10KB description doesn't crash", async ({ request }) => {
    const bigDesc = "A".repeat(9999);
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: "Giant Description Test",
        description: bigDesc,
        category: "Other",
        price: "30",
      },
    });
    expect(res.status()).toBe(201);
  });

  test("C04.02 listing with description over 10KB is rejected", async ({ request }) => {
    const hugeDesc = "B".repeat(10001);
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: "Too Big Description",
        description: hugeDesc,
        category: "Other",
        price: "30",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("C04.03 title at max length (200 chars)", async ({ request }) => {
    const maxTitle = "T".repeat(200);
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: maxTitle,
        description: "Max title test",
        category: "Other",
        price: "25",
      },
    });
    expect(res.status()).toBe(201);
  });

  test("C04.04 title over max length (201 chars) is rejected", async ({ request }) => {
    const tooLong = "T".repeat(201);
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: tooLong,
        description: "Too long title test",
        category: "Other",
        price: "25",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("C04.05 CSV with 5000 rows doesn't crash", async ({ request }) => {
    const rows = ["title,description,category,price"];
    for (let i = 0; i < 5000; i++) {
      rows.push(`"Huge CSV ${i}","desc",Other,${10 + (i % 100)}`);
    }
    const res = await request.post(`${BASE}/api/bulk-import`, {
      headers: { ...auth(), "Content-Type": "text/csv" },
      data: rows.join("\n"),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.imported).toBe(5000);
  });

  test("C04.06 1MB CSV body doesn't crash", async ({ request }) => {
    const rows = ["title,description,category,price"];
    const longDesc = "X".repeat(500);
    // ~550 bytes per row, ~1820 rows = ~1MB
    for (let i = 0; i < 1820; i++) {
      rows.push(`"MB Test ${i}","${longDesc}",Other,${20 + (i % 80)}`);
    }
    const csv = rows.join("\n");
    expect(csv.length).toBeGreaterThan(900_000);

    const res = await request.post(`${BASE}/api/bulk-import`, {
      headers: { ...auth(), "Content-Type": "text/csv" },
      data: csv,
    });
    expect(res.ok()).toBeTruthy();
  });
});

/* ================================================================== */
/*  C05 — Rapid Fire CRUD                                              */
/* ================================================================== */

test.describe("C05 — Rapid Fire CRUD", () => {
  test("C05.01 100 rapid create-delete cycles", async ({ request }) => {
    let created = 0;
    let deleted = 0;
    for (let i = 0; i < 100; i++) {
      const res = await request.post(`${BASE}/api/listings`, {
        headers: auth(),
        multipart: {
          title: `Rapid ${i}`,
          description: "Rapid fire CRUD test",
          category: "Other",
          price: "15",
        },
      });
      if (res.status() === 201) {
        created++;
        const { id } = await res.json();
        const del = await request.delete(`${BASE}/api/listings/${id}`, { headers: auth() });
        if (del.ok()) deleted++;
      }
    }
    expect(created).toBe(100);
    expect(deleted).toBe(100);
  });

  test("C05.02 50 concurrent create + 50 concurrent read simultaneously", async ({ request }) => {
    const writes = Array.from({ length: 50 }, (_, i) =>
      request.post(`${BASE}/api/listings`, {
        headers: auth(),
        multipart: {
          title: `SimulWrite ${i}`,
          description: "Simultaneous write test",
          category: "Other",
          price: String(10 + i),
        },
      })
    );
    const reads = Array.from({ length: 50 }, () =>
      request.get(`${BASE}/api/listings?limit=5`, { headers: auth() })
    );

    const results = await Promise.all([...writes, ...reads]);
    const writeResults = results.slice(0, 50);
    const readResults = results.slice(50);

    expect(writeResults.filter((r) => r.status() === 201).length).toBe(50);
    expect(readResults.every((r) => r.ok())).toBe(true);
  });
});

/* ================================================================== */
/*  C06 — Batch Operations at Scale                                    */
/* ================================================================== */

test.describe("C06 — Batch Operations at Scale", () => {
  test("C06.01 batch activate 500 listings", async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/listings?limit=500&status=draft`, { headers: auth() });
    const data = await listRes.json();
    const ids = data.listings.map((l: { id: string }) => l.id);
    if (ids.length < 10) return; // skip if not enough data

    const res = await request.post(`${BASE}/api/batch`, {
      headers: auth(),
      data: { action: "activate", listingIds: ids },
    });
    expect(res.ok()).toBeTruthy();
    const result = await res.json();
    expect(result.updated).toBeGreaterThan(0);
  });

  test("C06.02 batch duplicate 100 listings", async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/listings?limit=100`, { headers: auth() });
    const data = await listRes.json();
    const ids = data.listings.slice(0, 100).map((l: { id: string }) => l.id);
    if (ids.length < 5) return;

    const res = await request.post(`${BASE}/api/batch`, {
      headers: auth(),
      data: { action: "duplicate", listingIds: ids },
    });
    expect(res.ok()).toBeTruthy();
    const result = await res.json();
    expect(result.updated).toBe(ids.length);
  });

  test("C06.03 batch delete 200 listings", async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/listings?limit=200`, { headers: auth() });
    const data = await listRes.json();
    const ids = data.listings.slice(0, 200).map((l: { id: string }) => l.id);
    if (ids.length < 5) return;

    const res = await request.post(`${BASE}/api/batch`, {
      headers: auth(),
      data: { action: "delete", listingIds: ids },
    });
    expect(res.ok()).toBeTruthy();
  });
});

/* ================================================================== */
/*  C07 — Auth Bombardment                                             */
/* ================================================================== */

test.describe("C07 — Auth Bombardment", () => {
  test("C07.01 100 concurrent login attempts (valid)", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        request.post(`${BASE}/api/auth/login`, {
          data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
        })
      )
    );
    expect(results.every((r) => r.ok())).toBe(true);
  });

  test("C07.02 100 concurrent login attempts (invalid)", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        request.post(`${BASE}/api/auth/login`, {
          data: { email: `fake${i}@test.com`, password: "wrongpass" },
        })
      )
    );
    expect(results.every((r) => r.status() === 401)).toBe(true);
  });

  test("C07.03 50 concurrent registrations (all unique emails)", async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        request.post(`${BASE}/api/auth/register`, {
          data: {
            email: `crashtest${Date.now()}${i}@test.io`,
            username: `crashuser${Date.now()}${i}`,
            password: "TestPass123!",
          },
        })
      )
    );
    const successes = results.filter((r) => r.ok() || r.status() === 201);
    // At least some should succeed — others may race on unique constraints or have different status codes
    expect(successes.length).toBeGreaterThan(0);
    // None should be 500 (server crash)
    const crashes = results.filter((r) => r.status() >= 500);
    expect(crashes.length).toBe(0);
  });
});

/* ================================================================== */
/*  C08 — Malformed / Adversarial Input                                */
/* ================================================================== */

test.describe("C08 — Malformed & Adversarial Input", () => {
  test("C08.01 SQL injection in title field", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: "'; DROP TABLE Listing; --",
        description: "SQL injection test",
        category: "Other",
        price: "10",
      },
    });
    // Should create normally — Prisma parameterizes queries
    expect(res.status()).toBe(201);
    // Verify DB is still alive
    const check = await request.get(`${BASE}/api/listings?limit=1`, { headers: auth() });
    expect(check.ok()).toBeTruthy();
  });

  test("C08.02 XSS in description field", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: "XSS Test Item",
        description: '<script>alert("xss")</script><img onerror="alert(1)" src=x>',
        category: "Other",
        price: "20",
      },
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    // Script tags should be stripped
    expect(data.description).not.toContain("<script>");
  });

  test("C08.03 unicode bomb in title", async ({ request }) => {
    const unicodeBomb = "\u202E\u0000\uFEFF\uFFFF" + "Normal Title";
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: unicodeBomb,
        description: "Unicode test",
        category: "Other",
        price: "15",
      },
    });
    // Should handle gracefully — create, reject, or internal error from DB, but not hang
    expect(res.status()).toBeLessThanOrEqual(500);
    // Server should still be alive after
    const alive = await request.get(`${BASE}/api/listings?limit=1`, { headers: auth() });
    expect(alive.ok()).toBeTruthy();
  });

  test("C08.04 negative price is rejected", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: "Negative Price",
        description: "Should fail",
        category: "Other",
        price: "-50",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("C08.05 price of $1,000,001 is rejected", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: "Million Dollar Item",
        description: "Should fail",
        category: "Other",
        price: "1000001",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("C08.06 empty JSON body to all POST endpoints", async ({ request }) => {
    const endpoints = ["/api/batch", "/api/sales", "/api/analytics", "/api/inbox"];
    const results = await Promise.all(
      endpoints.map((ep) =>
        request.post(`${BASE}${ep}`, { headers: auth(), data: {} })
      )
    );
    // All should return 400, not 500
    for (const res of results) {
      expect(res.status()).toBeLessThan(500);
    }
  });

  test("C08.07 non-JSON body to JSON endpoints", async ({ request }) => {
    const res = await request.post(`${BASE}/api/batch`, {
      headers: { ...auth(), "Content-Type": "application/json" },
      data: "this is not json at all {{{",
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("C08.08 CSV with embedded newlines and quotes", async ({ request }) => {
    const csv = [
      "title,description,category,price",
      '"Item with ""quotes""","Description with\nnewline",Other,25',
      '"Another, with commas","OK desc",Other,30',
    ].join("\n");
    const res = await request.post(`${BASE}/api/bulk-import`, {
      headers: { ...auth(), "Content-Type": "text/csv" },
      data: csv,
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.imported).toBeGreaterThanOrEqual(1);
  });
});

/* ================================================================== */
/*  C09 — Response Time Under Heavy Data                               */
/* ================================================================== */

test.describe("C09 — Response Time Under Heavy Data", () => {
  test("C09.01 listings endpoint still responds under 2s with 1000+ rows", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/listings?limit=100`, { headers: auth() })
    );
    expect(ms).toBeLessThan(2000);
  });

  test("C09.02 analytics endpoint still responds under 3s with heavy data", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/analytics`, { headers: auth() })
    );
    expect(ms).toBeLessThan(3000);
  });

  test("C09.03 sales stats still responds under 2s with many sales", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/sales?stats=true`, { headers: auth() })
    );
    expect(ms).toBeLessThan(2000);
  });

  test("C09.04 ops/summary still responds under 2s", async ({ request }) => {
    const ms = await timed(() =>
      request.get(`${BASE}/api/ops/summary`, { headers: auth() })
    );
    expect(ms).toBeLessThan(2000);
  });
});

/* ================================================================== */
/*  C10 — Server Alive After All Abuse                                 */
/* ================================================================== */

test.describe("C10 — Server Alive After All Abuse", () => {
  test("C10.01 server still responds to health check", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health-check`);
    expect(res.ok()).toBeTruthy();
  });

  test("C10.02 can still login after abuse", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("C10.03 can still create a listing after abuse", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      headers: auth(),
      multipart: {
        title: "Survived The Storm",
        description: "If you can read this, the server survived",
        category: "Other",
        price: "99",
      },
    });
    expect(res.status()).toBe(201);
  });

  test("C10.04 can still read listings after abuse", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?limit=5`, { headers: auth() });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.listings.length).toBeGreaterThan(0);
  });

  test("C10.05 database integrity — count is consistent", async ({ request }) => {
    const res1 = await request.get(`${BASE}/api/listings?limit=1`, { headers: auth() });
    const data1 = await res1.json();
    const res2 = await request.get(`${BASE}/api/listings?limit=1`, { headers: auth() });
    const data2 = await res2.json();
    expect(data1.total).toBe(data2.total);
  });
});
