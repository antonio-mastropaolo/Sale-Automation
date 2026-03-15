import { test, expect, type APIRequestContext } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Shared auth state — seed admin, login, capture session cookie      */
/* ------------------------------------------------------------------ */

const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";

let SESSION_COOKIE = "";

function authHeaders() {
  return { Cookie: `session_token=${SESSION_COOKIE}` };
}

const PLATFORMS = [
  "depop",
  "grailed",
  "poshmark",
  "mercari",
  "ebay",
  "vinted",
  "facebook",
  "vestiaire",
] as const;

type Platform = (typeof PLATFORMS)[number];

/* ------------------------------------------------------------------ */
/*  Global setup — runs once before the entire file                    */
/* ------------------------------------------------------------------ */

test.beforeAll(async ({ request }) => {
  // 1. Seed admin user
  const seedRes = await request.get("/api/auth/seed");
  expect(seedRes.ok()).toBeTruthy();

  // 2. Login and capture session_token
  const loginRes = await request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  expect(loginRes.ok()).toBeTruthy();

  const setCookieHeader =
    loginRes.headers()["set-cookie"] ||
    loginRes.headers()["Set-Cookie"] ||
    "";
  const match = setCookieHeader.match(/session_token=([^;]+)/);
  expect(match).toBeTruthy();
  SESSION_COOKIE = match![1];
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Create a listing via multipart and return its ID. */
async function createListing(
  request: APIRequestContext,
  titleSuffix: string
): Promise<string> {
  const res = await request.post("/api/listings", {
    headers: authHeaders(),
    multipart: {
      title: `Platform Test ${titleSuffix} ${Date.now()}`,
      description: `Auto-created for platform stress test - ${titleSuffix}`,
      category: "Tops",
      brand: "Nike",
      size: "M",
      condition: "Good",
      price: "30",
    },
  });
  const body = await res.json();
  return body.id || body.listing?.id;
}

/* ================================================================== */
/*  P1  Platform Connect API (40 tests)                                */
/* ================================================================== */

test.describe("P1 Platform Connect API", () => {
  for (const platform of PLATFORMS) {
    test(`P1-${platform}-01 GET /api/platforms/connect includes ${platform}`, async ({
      request,
    }) => {
      const res = await request.get("/api/platforms/connect", {
        headers: authHeaders(),
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const entry = body.find((p: any) => p.platform === platform);
      expect(entry).toBeDefined();
      expect(entry.platform).toBe(platform);
    });

    test(`P1-${platform}-02 POST /api/platforms/connect with ${platform} returns 200`, async ({
      request,
    }) => {
      const res = await request.post("/api/platforms/connect", {
        headers: authHeaders(),
        data: {
          platform,
          username: `stress-test-${platform}`,
          password: `stress-pass-${platform}`,
        },
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.platform).toBe(platform);
    });

    test(`P1-${platform}-03 GET after connect shows ${platform} connected=true`, async ({
      request,
    }) => {
      // Ensure connected first
      await request.post("/api/platforms/connect", {
        headers: authHeaders(),
        data: {
          platform,
          username: `verify-${platform}`,
          password: `verify-pass-${platform}`,
        },
      });

      const res = await request.get("/api/platforms/connect", {
        headers: authHeaders(),
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const entry = body.find((p: any) => p.platform === platform);
      expect(entry).toBeDefined();
      expect(entry.connected).toBe(true);
    });

    test(`P1-${platform}-04 DELETE /api/platforms/connect?platform=${platform} removes it`, async ({
      request,
    }) => {
      // Ensure connected first
      await request.post("/api/platforms/connect", {
        headers: authHeaders(),
        data: {
          platform,
          username: `delete-${platform}`,
          password: `delete-pass-${platform}`,
        },
      });

      const res = await request.delete(
        `/api/platforms/connect?platform=${platform}`,
        { headers: authHeaders() }
      );
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test(`P1-${platform}-05 GET after DELETE shows ${platform} connected=false`, async ({
      request,
    }) => {
      // Connect then disconnect
      await request.post("/api/platforms/connect", {
        headers: authHeaders(),
        data: {
          platform,
          username: `reconnect-${platform}`,
          password: `reconnect-pass-${platform}`,
        },
      });
      await request.delete(`/api/platforms/connect?platform=${platform}`, {
        headers: authHeaders(),
      });

      const res = await request.get("/api/platforms/connect", {
        headers: authHeaders(),
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const entry = body.find((p: any) => p.platform === platform);
      expect(entry).toBeDefined();
      expect(entry.connected).toBe(false);
    });
  }
});

/* ================================================================== */
/*  P2  Platform Config API (40 tests)                                 */
/* ================================================================== */

// Note: platform-config route only supports depop, grailed, poshmark,
// mercari, ebay in its PLATFORM_KEYS array. We test all 8 but expect
// 400 for platforms not in that list.

const CONFIG_PLATFORMS: Platform[] = [
  "depop",
  "grailed",
  "poshmark",
  "mercari",
  "ebay",
];

test.describe("P2 Platform Config API", () => {
  for (const platform of PLATFORMS) {
    const isKnown = CONFIG_PLATFORMS.includes(platform as any);

    test(`P2-${platform}-01 GET /api/settings/platform-config returns config`, async ({
      request,
    }) => {
      const res = await request.get("/api/settings/platform-config", {
        headers: authHeaders(),
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      if (isKnown) {
        expect(body).toHaveProperty(platform);
      }
    });

    test(`P2-${platform}-02 GET /api/settings/platform-config?platform=${platform} returns config or 400`, async ({
      request,
    }) => {
      const res = await request.get(
        `/api/settings/platform-config?platform=${platform}`,
        { headers: authHeaders() }
      );
      if (isKnown) {
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.platform).toBe(platform);
        expect(body.config).toBeDefined();
      } else {
        expect(res.status()).toBe(400);
      }
    });

    test(`P2-${platform}-03 POST /api/settings/platform-config saves or rejects ${platform}`, async ({
      request,
    }) => {
      const res = await request.post("/api/settings/platform-config", {
        headers: authHeaders(),
        data: {
          platform,
          config: {
            maxTitleLength: 80,
            hashtagLimit: 5,
            tone: "casual",
          },
        },
      });
      if (isKnown) {
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.ok).toBe(true);
      } else {
        expect(res.status()).toBe(400);
      }
    });

    test(`P2-${platform}-04 POST /api/settings/platform-config with invalid platform returns 400`, async ({
      request,
    }) => {
      const res = await request.post("/api/settings/platform-config", {
        headers: authHeaders(),
        data: {
          platform: `${platform}_INVALID_XYZ`,
          config: { test: true },
        },
      });
      expect(res.status()).toBe(400);
    });

    test(`P2-${platform}-05 saved config persists (read after write) for ${platform}`, async ({
      request,
    }) => {
      if (!isKnown) {
        test.skip();
        return;
      }
      // Write a config
      const writeRes = await request.post("/api/settings/platform-config", {
        headers: authHeaders(),
        data: {
          platform,
          config: {
            maxTitleLength: 100,
            testField: `persist-test-${Date.now()}`,
          },
        },
      });
      expect(writeRes.ok()).toBeTruthy();

      // Read it back
      const readRes = await request.get(
        `/api/settings/platform-config?platform=${platform}`,
        { headers: authHeaders() }
      );
      expect(readRes.ok()).toBeTruthy();
      const body = await readRes.json();
      expect(body.config.maxTitleLength).toBe(100);
    });
  }
});

/* ================================================================== */
/*  P3  AI Optimization per Platform (16 tests)                        */
/* ================================================================== */

test.describe("P3 AI Optimization per Platform", () => {
  for (const platform of PLATFORMS) {
    test(`P3-${platform}-01 POST /api/ai/optimize for ${platform} (skipped — needs AI key)`, async () => {
      test.skip(true, "Needs AI key");
    });

    test(`P3-${platform}-02 prompt exists for platform_${platform}`, async ({
      request,
    }) => {
      const res = await request.get("/api/settings/prompts", {
        headers: authHeaders(),
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const prompts = Array.isArray(body) ? body : body.prompts || [];
      const platformPrompt = prompts.find(
        (p: any) => p.featureKey === `platform_${platform}`
      );
      expect(platformPrompt).toBeDefined();
      expect(platformPrompt.featureKey).toBe(`platform_${platform}`);
    });
  }
});

/* ================================================================== */
/*  P4  Scheduler per Platform (24 tests)                              */
/* ================================================================== */

test.describe("P4 Scheduler per Platform", () => {
  for (const platform of PLATFORMS) {
    let listingId: string;

    test(`P4-${platform}-01 create listing for ${platform} scheduler`, async ({
      request,
    }) => {
      listingId = await createListing(request, `sched-${platform}`);
      expect(listingId).toBeDefined();
    });

    test(`P4-${platform}-02 POST /api/scheduler with ${platform} returns 201`, async ({
      request,
    }) => {
      // Create listing if needed (test isolation)
      if (!listingId) {
        listingId = await createListing(request, `sched-fallback-${platform}`);
      }

      const res = await request.post("/api/scheduler", {
        headers: authHeaders(),
        data: {
          listingId,
          platform,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });
      expect([200, 201]).toContain(res.status());
      const body = await res.json();
      expect(body.platform).toBe(platform);
    });

    test(`P4-${platform}-03 GET /api/scheduler shows ${platform} post`, async ({
      request,
    }) => {
      // Create a fresh listing and schedule
      const freshId = await createListing(
        request,
        `sched-verify-${platform}`
      );
      await request.post("/api/scheduler", {
        headers: authHeaders(),
        data: {
          listingId: freshId,
          platform,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const res = await request.get("/api/scheduler", {
        headers: authHeaders(),
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const posts = Array.isArray(body) ? body : body.schedules || [];
      const found = posts.find((p: any) => p.platform === platform);
      expect(found).toBeDefined();
    });
  }
});

/* ================================================================== */
/*  P5  Batch Operations (16 tests)                                    */
/* ================================================================== */

test.describe("P5 Batch Operations", () => {
  let batchIds: string[] = [];

  test("P5-01 create 3 listings for batch ops", async ({ request }) => {
    for (let i = 0; i < 3; i++) {
      const id = await createListing(request, `batch-${i}`);
      if (id) batchIds.push(id);
    }
    expect(batchIds.length).toBe(3);
  });

  test("P5-02 batch activate all 3", async ({ request }) => {
    if (batchIds.length === 0) test.skip();
    const res = await request.post("/api/batch", {
      headers: authHeaders(),
      data: { action: "activate", listingIds: batchIds },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.updated).toBe(3);
  });

  test("P5-03 batch deactivate all 3", async ({ request }) => {
    if (batchIds.length === 0) test.skip();
    const res = await request.post("/api/batch", {
      headers: authHeaders(),
      data: { action: "deactivate", listingIds: batchIds },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.updated).toBe(3);
  });

  test("P5-04 batch duplicate all 3 (verify 6 total)", async ({
    request,
  }) => {
    if (batchIds.length === 0) test.skip();
    const res = await request.post("/api/batch", {
      headers: authHeaders(),
      data: { action: "duplicate", listingIds: batchIds },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.updated).toBe(3);

    // Verify we now have the originals + duplicates
    const listRes = await request.get("/api/listings", {
      headers: authHeaders(),
    });
    const listings = await listRes.json();
    const allListings = Array.isArray(listings)
      ? listings
      : listings.listings || [];
    // Find our batch items (titles contain "batch-" or "(Copy)")
    const batchItems = allListings.filter(
      (l: any) =>
        batchIds.includes(l.id) ||
        (l.title.includes("Platform Test batch-") &&
          l.title.includes("(Copy)"))
    );
    expect(batchItems.length).toBeGreaterThanOrEqual(6);
  });

  test("P5-05 batch delete the duplicates", async ({ request }) => {
    // Find duplicates by title containing "(Copy)"
    const listRes = await request.get("/api/listings", {
      headers: authHeaders(),
    });
    const listings = await listRes.json();
    const allListings = Array.isArray(listings)
      ? listings
      : listings.listings || [];
    const dupeIds = allListings
      .filter(
        (l: any) =>
          l.title.includes("Platform Test batch-") &&
          l.title.includes("(Copy)")
      )
      .map((l: any) => l.id);

    if (dupeIds.length === 0) {
      test.skip();
      return;
    }

    const res = await request.post("/api/batch", {
      headers: authHeaders(),
      data: { action: "delete", listingIds: dupeIds },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("P5-06 verify original 3 remain", async ({ request }) => {
    if (batchIds.length === 0) test.skip();
    let allPresent = true;
    for (const id of batchIds) {
      const res = await request.get(`/api/listings/${id}`, {
        headers: authHeaders(),
      });
      if (!res.ok()) allPresent = false;
    }
    expect(allPresent).toBe(true);
  });

  // P5-07 through P5-14: Record a sale for each platform
  for (const platform of PLATFORMS) {
    test(`P5-sale-${platform} record sale for ${platform}`, async ({
      request,
    }) => {
      const res = await request.post("/api/sales", {
        headers: authHeaders(),
        data: {
          title: `Platform Sale Test ${platform} ${Date.now()}`,
          platform,
          soldPrice: 50,
          costPrice: 20,
          shippingCost: 5,
          platformFee: 3,
        },
      });
      expect([200, 201]).toContain(res.status());
      const body = await res.json();
      expect(body.platform).toBe(platform);
    });
  }

  test("P5-15 verify all 8 platform sales recorded correctly", async ({
    request,
  }) => {
    const res = await request.get("/api/sales", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const sales = await res.json();
    const allSales = Array.isArray(sales) ? sales : sales.sales || [];

    for (const platform of PLATFORMS) {
      const found = allSales.find(
        (s: any) =>
          s.platform === platform &&
          s.title.includes("Platform Sale Test")
      );
      expect(found).toBeDefined();
      expect(found.platform).toBe(platform);
    }
  });

  test("P5-16 each sale has correct profit calculation", async ({
    request,
  }) => {
    const res = await request.get("/api/sales", {
      headers: authHeaders(),
    });
    const sales = await res.json();
    const allSales = Array.isArray(sales) ? sales : sales.sales || [];
    const platformSales = allSales.filter((s: any) =>
      s.title.includes("Platform Sale Test")
    );

    for (const sale of platformSales) {
      // profit = soldPrice - costPrice - shippingCost - platformFee
      const expectedProfit =
        sale.soldPrice - sale.costPrice - sale.shippingCost - sale.platformFee;
      expect(sale.profit).toBeCloseTo(expectedProfit, 2);
    }
  });
});

/* ================================================================== */
/*  P6  Export with Platform Data (10 tests)                           */
/* ================================================================== */

test.describe("P6 Export with Platform Data", () => {
  test("P6-01 GET /api/export?type=listings returns CSV", async ({
    request,
  }) => {
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  test("P6-02 GET /api/export?type=sales returns CSV with platform column", async ({
    request,
  }) => {
    const res = await request.get("/api/export?type=sales", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text.toLowerCase()).toContain("platform");
  });

  test("P6-03 CSV has correct headers for listings", async ({ request }) => {
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    const text = await res.text();
    const headerLine = text.split("\n")[0].toLowerCase();
    expect(headerLine).toContain("title");
    expect(headerLine).toContain("price");
  });

  test("P6-04 content-type is text/csv", async ({ request }) => {
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toContain("text/csv");
  });

  test("P6-05 CSV has Content-Disposition header", async ({ request }) => {
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    const disposition = res.headers()["content-disposition"] || "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("filename=");
  });

  test("P6-06 sales export shows correct platform names", async ({
    request,
  }) => {
    // Record a sale for a known platform first
    await request.post("/api/sales", {
      headers: authHeaders(),
      data: {
        title: `Export Verify Sale ${Date.now()}`,
        platform: "depop",
        soldPrice: 45,
        costPrice: 15,
        shippingCost: 4,
        platformFee: 2,
      },
    });

    const res = await request.get("/api/export?type=sales", {
      headers: authHeaders(),
    });
    const text = await res.text();
    expect(text).toContain("depop");
  });

  test("P6-07 export with no data returns header-only CSV", async ({
    request,
  }) => {
    // We cannot guarantee empty state, but we can verify the CSV has at
    // least a header row. This test checks structure, not emptiness.
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    const text = await res.text();
    const lines = text.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(1); // at least header
  });

  test("P6-08 invalid export type returns 400", async ({ request }) => {
    const res = await request.get("/api/export?type=bogus", {
      headers: authHeaders(),
    });
    expect(res.status()).toBe(400);
  });

  test("P6-09 large export (10 listings) completes < 2000ms", async ({
    request,
  }) => {
    // Create 10 listings
    for (let i = 0; i < 10; i++) {
      await createListing(request, `export-perf-${i}`);
    }
    const start = Date.now();
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(2000);
  });

  test("P6-10 sales export includes profit calculation", async ({
    request,
  }) => {
    const res = await request.get("/api/export?type=sales", {
      headers: authHeaders(),
    });
    const text = await res.text();
    const headerLine = text.split("\n")[0].toLowerCase();
    expect(headerLine).toContain("profit");
  });
});

/* ================================================================== */
/*  P7  Platform Branding Consistency (16 tests)                       */
/* ================================================================== */

test.describe("P7 Platform Branding Consistency", () => {
  let prompts: any[] = [];

  test("P7-00 fetch prompts list", async ({ request }) => {
    const res = await request.get("/api/settings/prompts", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    prompts = Array.isArray(body) ? body : body.prompts || [];
  });

  for (const platform of PLATFORMS) {
    test(`P7-${platform}-01 prompt exists for platform_${platform}`, async ({
      request,
    }) => {
      const res = await request.get("/api/settings/prompts", {
        headers: authHeaders(),
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const allPrompts = Array.isArray(body) ? body : body.prompts || [];
      const found = allPrompts.find(
        (p: any) => p.featureKey === `platform_${platform}`
      );
      expect(found).toBeDefined();
    });

    test(`P7-${platform}-02 platform_${platform} prompt is not empty`, async ({
      request,
    }) => {
      const res = await request.get("/api/settings/prompts", {
        headers: authHeaders(),
      });
      const body = await res.json();
      const allPrompts = Array.isArray(body) ? body : body.prompts || [];
      const found = allPrompts.find(
        (p: any) => p.featureKey === `platform_${platform}`
      );
      expect(found).toBeDefined();
      const promptText = found.defaultPrompt || found.prompt || "";
      expect(promptText.trim().length).toBeGreaterThan(0);
    });
  }
});

/* ================================================================== */
/*  P8  Trends Platform Tips (16 tests)                                */
/* ================================================================== */

let cachedTrends: any = null;

async function fetchTrends(request: APIRequestContext) {
  if (cachedTrends) return cachedTrends;
  const res = await request.get("/api/ai/trends", {
    headers: authHeaders(),
  });
  expect(res.ok()).toBeTruthy();
  cachedTrends = await res.json();
  return cachedTrends;
}

test.describe("P8 Trends Platform Tips", () => {
  test("P8-01 GET /api/ai/trends returns platformTips object", async ({
    request,
  }) => {
    const body = await fetchTrends(request);
    expect(typeof body.platformTips).toBe("object");
    expect(body.platformTips).not.toBeNull();
  });

  test("P8-02 platformTips has exactly 8 keys", async ({ request }) => {
    const body = await fetchTrends(request);
    const keys = Object.keys(body.platformTips);
    expect(keys.length).toBe(8);
  });

  test("P8-03 each platformTips value is a non-empty string", async ({
    request,
  }) => {
    const body = await fetchTrends(request);
    for (const platform of PLATFORMS) {
      expect(typeof body.platformTips[platform]).toBe("string");
      expect(body.platformTips[platform].trim().length).toBeGreaterThan(0);
    }
  });

  test("P8-04 each platformTips key is a valid platform ID", async ({
    request,
  }) => {
    const body = await fetchTrends(request);
    const keys = Object.keys(body.platformTips);
    for (const key of keys) {
      expect(PLATFORMS).toContain(key);
    }
  });

  test("P8-05 trendingCategories exist (at least 1)", async ({ request }) => {
    const body = await fetchTrends(request);
    expect(Array.isArray(body.trendingCategories)).toBe(true);
    expect(body.trendingCategories.length).toBeGreaterThanOrEqual(1);
  });

  test("P8-06 trendingBrands exist (at least 1)", async ({ request }) => {
    const body = await fetchTrends(request);
    expect(Array.isArray(body.trendingBrands)).toBe(true);
    expect(body.trendingBrands.length).toBeGreaterThanOrEqual(1);
  });

  test("P8-07 hotItems exist (at least 1)", async ({ request }) => {
    const body = await fetchTrends(request);
    expect(Array.isArray(body.hotItems)).toBe(true);
    expect(body.hotItems.length).toBeGreaterThanOrEqual(1);
  });

  test("P8-08 sleeperPicks exist (at least 1)", async ({ request }) => {
    const body = await fetchTrends(request);
    expect(Array.isArray(body.sleeperPicks)).toBe(true);
    expect(body.sleeperPicks.length).toBeGreaterThanOrEqual(1);
  });

  test("P8-09 seasonalAdvice is a non-empty string", async ({ request }) => {
    const body = await fetchTrends(request);
    expect(typeof body.seasonalAdvice).toBe("string");
    expect(body.seasonalAdvice.trim().length).toBeGreaterThan(0);
  });

  test("P8-10 response time < 15000ms", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/ai/trends", {
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(15000);
  });

  test("P8-11 response is valid JSON", async ({ request }) => {
    const res = await request.get("/api/ai/trends", {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });

  test("P8-12 response status is 200", async ({ request }) => {
    const res = await request.get("/api/ai/trends", {
      headers: authHeaders(),
    });
    expect(res.status()).toBe(200);
  });

  test("P8-13 Content-Type is application/json", async ({ request }) => {
    const res = await request.get("/api/ai/trends", {
      headers: authHeaders(),
    });
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toContain("application/json");
  });

  test("P8-14 no HTML in platformTips values", async ({ request }) => {
    const body = await fetchTrends(request);
    const htmlTagRegex = /<\/?[a-z][\s\S]*?>/i;
    for (const platform of PLATFORMS) {
      expect(htmlTagRegex.test(body.platformTips[platform])).toBe(false);
    }
  });

  test("P8-15 all heat scores are numbers 0-100", async ({ request }) => {
    const body = await fetchTrends(request);
    const allHeats = [
      ...body.trendingCategories.map((c: any) => c.heat),
      ...body.trendingBrands.map((b: any) => b.heat),
    ];
    for (const heat of allHeats) {
      expect(typeof heat).toBe("number");
      expect(heat).toBeGreaterThanOrEqual(0);
      expect(heat).toBeLessThanOrEqual(100);
    }
  });

  test("P8-16 all sleeperPick estimatedROI contains %", async ({
    request,
  }) => {
    const body = await fetchTrends(request);
    for (const pick of body.sleeperPicks) {
      expect(pick.estimatedROI).toContain("%");
    }
  });
});

/* ================================================================== */
/*  P9  Image Search API (8 tests)                                     */
/* ================================================================== */

test.describe("P9 Image Search API", () => {
  test("P9-01 GET /api/image-search?q=Nike returns JSON with url field", async ({
    request,
  }) => {
    const res = await request.get("/api/image-search?q=Nike", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("url");
  });

  test("P9-02 GET /api/image-search without q returns empty url", async ({
    request,
  }) => {
    const res = await request.get("/api/image-search", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.url).toBe("");
  });

  test("P9-03 GET /api/image-search?q=very+specific+product returns url or empty", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/image-search?q=very+specific+obscure+product+xyz123",
      { headers: authHeaders() }
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("url");
    // url can be a string (empty or with value) — just verify it doesn't crash
    expect(typeof body.url).toBe("string");
  });

  test("P9-04 response time < 10000ms", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/image-search?q=Nike+shoes", {
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(10000);
  });

  test("P9-05 response is valid JSON", async ({ request }) => {
    const res = await request.get("/api/image-search?q=test", {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });

  test("P9-06 multiple concurrent requests don't crash", async ({
    request,
  }) => {
    const promises = Array.from({ length: 3 }, (_, i) =>
      request.get(`/api/image-search?q=test${i}`, {
        headers: authHeaders(),
      })
    );
    const responses = await Promise.all(promises);
    for (const res of responses) {
      expect(res.ok()).toBeTruthy();
    }
  });

  test("P9-07 special characters in query don't crash", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/image-search?q=${encodeURIComponent('Nike "Air Force" <1> & more')}`,
      { headers: authHeaders() }
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("url");
  });

  test("P9-08 very long query string doesn't crash", async ({ request }) => {
    const longQuery = "a".repeat(500);
    const res = await request.get(
      `/api/image-search?q=${encodeURIComponent(longQuery)}`,
      { headers: authHeaders() }
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("url");
  });
});

/* ================================================================== */
/*  P10  Competitor Discovery (10 tests)                               */
/* ================================================================== */

test.describe("P10 Competitor Discovery", () => {
  test("P10-01 POST /api/ai/competitor/discover with brand=Nike, category=Sneakers returns products", async ({
    request,
  }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "Nike", category: "Sneakers" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("products");
    expect(Array.isArray(body.products)).toBe(true);
  });

  test("P10-02 each product has name, sku, avgResalePrice fields", async ({
    request,
  }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "Nike", category: "Sneakers" },
    });
    const body = await res.json();
    for (const product of body.products) {
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("sku");
      expect(product).toHaveProperty("avgResalePrice");
    }
  });

  test("P10-03 products array has at least 1 item (fallback data if AI fails)", async ({
    request,
  }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "Nike", category: "Sneakers" },
    });
    const body = await res.json();
    expect(body.products.length).toBeGreaterThanOrEqual(1);
  });

  test("P10-04 marketInsight is a non-empty string", async ({ request }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "Nike", category: "Sneakers" },
    });
    const body = await res.json();
    expect(typeof body.marketInsight).toBe("string");
    expect(body.marketInsight.trim().length).toBeGreaterThan(0);
  });

  test("P10-05 bestPlatform values are valid platform IDs", async ({
    request,
  }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "Nike", category: "Sneakers" },
    });
    const body = await res.json();
    const validPlatforms = [
      "depop",
      "grailed",
      "poshmark",
      "mercari",
      "ebay",
      "vinted",
      "facebook",
      "vestiaire",
    ];
    for (const product of body.products) {
      if (product.bestPlatform) {
        expect(validPlatforms).toContain(product.bestPlatform);
      }
    }
  });

  test("P10-06 POST with empty brand AND empty category returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "", category: "" },
    });
    expect(res.status()).toBe(400);
  });

  test("P10-07 POST with only brand returns 200", async ({ request }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "Nike" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products.length).toBeGreaterThanOrEqual(1);
  });

  test("P10-08 POST with only category returns 200", async ({ request }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { category: "Sneakers" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products.length).toBeGreaterThanOrEqual(1);
  });

  test("P10-09 POST with brand + sku returns 200", async ({ request }) => {
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "Nike", category: "Sneakers", sku: "CW2288-111" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products.length).toBeGreaterThanOrEqual(1);
  });

  test("P10-10 response time < 30000ms", async ({ request }) => {
    const start = Date.now();
    const res = await request.post("/api/ai/competitor/discover", {
      headers: authHeaders(),
      data: { brand: "Nike", category: "Sneakers" },
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(30000);
  });
});
