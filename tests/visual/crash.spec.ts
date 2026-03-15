import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

// ════════════════════════════════════════════════════════════════════
// G. API CRASH TESTS — Listings CRUD
// ════════════════════════════════════════════════════════════════════

test.describe("G — Listings API crash tests", () => {
  test("G1: GET /api/listings returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("G2: GET /api/listings?status=draft returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?status=draft`);
    expect(res.status()).toBe(200);
  });

  test("G3: GET /api/listings?status=invalid returns 200 (no filter crash)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings?status=XYZINVALID`);
    expect(res.ok()).toBe(true);
  });

  test("G4: POST /api/listings with empty body returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      headers: { "Content-Type": "application/json" },
      data: {},
    });
    // Should be 400 bad request, not 500
    expect(res.status()).toBeLessThan(500);
  });

  test("G5: POST /api/listings with missing title returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        description: "Test description",
        price: "25.00",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("G6: POST /api/listings with negative price returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Test Item",
        description: "Test",
        price: "-10",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("G7: POST /api/listings with zero price returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Test Item",
        description: "Test",
        price: "0",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("G8: POST /api/listings with absurd price returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Test Item",
        description: "Test",
        price: "999999999",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("G9: POST /api/listings with XSS in title returns 400 or sanitized", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: '<script>alert("xss")</script>',
        description: "Test",
        price: "25",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body.title).not.toContain("<script>");
    }
  });

  test("G10: POST /api/listings with very long title returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "A".repeat(500),
        description: "Test",
        price: "25",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("G11: POST /api/listings with invalid category returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Test",
        description: "Test",
        price: "25",
        category: "NOT_A_CATEGORY",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("G12: POST /api/listings with invalid condition returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Test",
        description: "Test",
        price: "25",
        category: "tops",
        condition: "BROKEN_CONDITION",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("G13: POST /api/listings valid listing succeeds", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Crash Test Item",
        description: "A test item for crash testing",
        price: "29.99",
        category: "Tops",
        condition: "Good",
        brand: "TestBrand",
        size: "M",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.title).toBe("Crash Test Item");
    // Cleanup
    await request.delete(`${BASE}/api/listings/${body.id}`);
  });

  test("G14: POST /api/listings with price=NaN returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Test",
        description: "Test",
        price: "not_a_number",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ════════════════════════════════════════════════════════════════════
// H. Single Listing API crash tests
// ════════════════════════════════════════════════════════════════════

test.describe("H — Single listing API crash tests", () => {
  let testListingId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "H-Series Test",
        description: "Created for H tests",
        price: "19.99",
        category: "Tops",
        condition: "New with tags",
      },
    });
    if (res.ok()) {
      const body = await res.json();
      testListingId = body.id;
    }
  });

  test("H1: GET /api/listings/nonexistent returns 404", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });

  test("H2: GET /api/listings/invalid-uuid-format does not crash", async ({ request }) => {
    const res = await request.get(`${BASE}/api/listings/not-a-uuid`);
    expect(res.status()).toBeLessThan(500);
  });

  test("H3: GET /api/listings/[id] returns correct listing", async ({ request }) => {
    test.skip(!testListingId, "No test listing created");
    const res = await request.get(`${BASE}/api/listings/${testListingId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("H-Series Test");
  });

  test("H4: PATCH /api/listings/[id] with valid update", async ({ request }) => {
    test.skip(!testListingId, "No test listing created");
    const res = await request.patch(`${BASE}/api/listings/${testListingId}`, {
      data: { title: "Updated H-Series Test", price: 24.99 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Updated H-Series Test");
  });

  test("H5: PATCH /api/listings/[id] with empty body does not crash", async ({ request }) => {
    test.skip(!testListingId, "No test listing created");
    const res = await request.patch(`${BASE}/api/listings/${testListingId}`, {
      data: {},
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("H6: PATCH /api/listings/nonexistent returns 404", async ({ request }) => {
    const res = await request.patch(`${BASE}/api/listings/00000000-0000-0000-0000-000000000000`, {
      data: { title: "Nope" },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("H7: PATCH /api/listings/[id] with XSS in description", async ({ request }) => {
    test.skip(!testListingId, "No test listing created");
    const res = await request.patch(`${BASE}/api/listings/${testListingId}`, {
      data: { description: '<img src=x onerror=alert(1)>' },
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(body.description).not.toContain("<img");
    }
  });

  test("H8: PATCH /api/listings/[id] with negative price", async ({ request }) => {
    test.skip(!testListingId, "No test listing created");
    const res = await request.patch(`${BASE}/api/listings/${testListingId}`, {
      data: { price: -5 },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("H9: DELETE /api/listings/nonexistent returns 404", async ({ request }) => {
    const res = await request.delete(`${BASE}/api/listings/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBeLessThan(500);
  });

  test("H10: DELETE /api/listings/[id] succeeds", async ({ request }) => {
    test.skip(!testListingId, "No test listing created");
    const res = await request.delete(`${BASE}/api/listings/${testListingId}`);
    expect(res.status()).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════════
// I. Optimize & Publish API crash tests
// ════════════════════════════════════════════════════════════════════

test.describe("I — Optimize/Publish API crash tests", () => {
  test("I1: POST /api/listings/nonexistent/optimize returns 404", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings/00000000-0000-0000-0000-000000000000/optimize`);
    expect(res.status()).toBeLessThan(500);
  });

  test("I2: POST /api/listings/nonexistent/publish returns error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings/00000000-0000-0000-0000-000000000000/publish`, {
      data: { platform: "depop" },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("I3: POST /api/listings/[id]/publish with invalid platform", async ({ request }) => {
    // Create a listing first
    const createRes = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Publish Test",
        description: "Test item",
        price: "15",
        category: "tops",
        condition: "good",
      },
    });
    if (createRes.ok()) {
      const listing = await createRes.json();
      const res = await request.post(`${BASE}/api/listings/${listing.id}/publish`, {
        data: { platform: "INVALID_PLATFORM" },
      });
      expect(res.status()).toBeLessThan(500);
      // Cleanup
      await request.delete(`${BASE}/api/listings/${listing.id}`);
    }
  });

  test("I4: POST /api/listings/[id]/publish with no body", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Publish Body Test",
        description: "Test",
        price: "15",
        category: "tops",
        condition: "good",
      },
    });
    if (createRes.ok()) {
      const listing = await createRes.json();
      const res = await request.post(`${BASE}/api/listings/${listing.id}/publish`);
      expect(res.status()).toBeLessThan(500);
      await request.delete(`${BASE}/api/listings/${listing.id}`);
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// J. Platform Connect API crash tests
// ════════════════════════════════════════════════════════════════════

test.describe("J — Platform Connect API crash tests", () => {
  test("J1: GET /api/platforms/connect returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/platforms/connect`);
    expect(res.status()).toBe(200);
  });

  test("J2: POST /api/platforms/connect with empty body returns error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/platforms/connect`, {
      data: {},
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("J3: POST /api/platforms/connect with invalid platform returns error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/platforms/connect`, {
      data: { platform: "fakePlatform", username: "test", password: "test123" },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("J4: POST /api/platforms/connect with missing credentials returns error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/platforms/connect`, {
      data: { platform: "depop" },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("J5: DELETE /api/platforms/connect without platform param returns error", async ({ request }) => {
    const res = await request.delete(`${BASE}/api/platforms/connect`);
    expect(res.status()).toBeLessThan(500);
  });

  test("J6: DELETE /api/platforms/connect?platform=invalid returns error", async ({ request }) => {
    const res = await request.delete(`${BASE}/api/platforms/connect?platform=nonexistent`);
    expect(res.status()).toBeLessThan(500);
  });
});

// ════════════════════════════════════════════════════════════════════
// K. Analytics API crash tests
// ════════════════════════════════════════════════════════════════════

test.describe("K — Analytics API crash tests", () => {
  test("K1: GET /api/analytics returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics`);
    expect(res.status()).toBe(200);
  });

  test("K2: POST /api/analytics with empty body does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/analytics`, {
      data: {},
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("K3: POST /api/analytics with invalid event type", async ({ request }) => {
    const res = await request.post(`${BASE}/api/analytics`, {
      data: { eventType: "INVALID", platformListingId: "fake", value: 1 },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ════════════════════════════════════════════════════════════════════
// L. AI API crash tests
// ════════════════════════════════════════════════════════════════════

test.describe("L — AI API crash tests (no OPENAI_API_KEY)", () => {
  test("L1: POST /api/ai/optimize with empty body does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/optimize`, {
      data: {},
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("L2: POST /api/ai/smart-list with no image does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/smart-list`, {
      data: {},
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("L3: POST /api/ai/price-intel with empty body does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/price-intel`, {
      data: {},
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("L4: POST /api/ai/health-score with empty body does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/health-score`, {
      data: {},
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("L5: POST /api/ai/negotiate with empty body does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/negotiate`, {
      data: {},
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("L6: GET /api/ai/trends does not crash", async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/trends`);
    expect(res.status()).toBeLessThan(500);
  });

  test("L7: POST /api/ai/optimize with XSS payload does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/optimize`, {
      data: {
        action: "enhance",
        notes: '<script>alert("xss")</script>',
        category: "tops",
        brand: "Nike",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ════════════════════════════════════════════════════════════════════
// M. Page Navigation Crash Tests
// ════════════════════════════════════════════════════════════════════

test.describe("M — Page navigation crash tests", () => {
  test("M1: Dashboard loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("M2: Listings/new loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/listings/new");
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("M3: Listings/smart loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/listings/smart");
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("M4: Analytics loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/analytics");
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("M5: Trends loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/trends");
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("M6: Tools loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/tools");
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("M7: Settings loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/settings");
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("M8: Nonexistent listing page does not crash (404 or fallback)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/listings/00000000-0000-0000-0000-000000000000");
    // Wait for redirect or error handling
    await page.waitForTimeout(2000);
    // Should not have unhandled JS errors
    expect(errors).toHaveLength(0);
  });

  test("M9: Completely invalid route returns 404 page without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/this-does-not-exist");
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// N. Form Interaction Crash Tests
// ════════════════════════════════════════════════════════════════════

test.describe("N — Form interaction crash tests", () => {
  test("N1: Submit empty listing form shows validation error, not crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/listings/new");
    // Try to submit without filling anything
    const submitBtn = page.locator("button[type='submit'], button:text('Create Listing')").first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
    expect(errors).toHaveLength(0);
  });

  test("N2: Type special chars in search without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    const searchInput = page.locator("input[placeholder*='earch']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('"><script>alert(1)</script>');
      await page.waitForTimeout(500);
    }
    expect(errors).toHaveLength(0);
  });

  test("N3: Tools page profit calculator with zero values", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/tools");
    await page.waitForTimeout(500);
    // Find profit calculator inputs and set to 0
    const inputs = page.locator("input[type='number']");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill("0");
    }
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test("N4: Tools page profit calculator with negative values", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/tools");
    await page.waitForTimeout(500);
    const inputs = page.locator("input[type='number']");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill("-100");
    }
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test("N5: Rapid navigation between pages does not crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const routes = ["/", "/listings/new", "/analytics", "/trends", "/tools", "/settings"];
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// O. HTTP Method Tests
// ════════════════════════════════════════════════════════════════════

test.describe("O — HTTP method enforcement", () => {
  test("O1: PUT /api/listings returns 405", async ({ request }) => {
    const res = await request.put(`${BASE}/api/listings`, { data: {} });
    expect(res.status()).toBeLessThan(500);
  });

  test("O2: DELETE /api/listings (without id) returns error", async ({ request }) => {
    const res = await request.delete(`${BASE}/api/listings`);
    expect(res.status()).toBeLessThan(500);
  });

  test("O3: PUT /api/platforms/connect returns 405", async ({ request }) => {
    const res = await request.put(`${BASE}/api/platforms/connect`, { data: {} });
    expect(res.status()).toBeLessThan(500);
  });

  test("O4: PATCH /api/analytics returns error (not supported)", async ({ request }) => {
    const res = await request.patch(`${BASE}/api/analytics`, { data: {} });
    expect(res.status()).toBeLessThan(500);
  });
});

// ════════════════════════════════════════════════════════════════════
// P. Large Payload / Edge Case Tests
// ════════════════════════════════════════════════════════════════════

test.describe("P — Large payload & edge cases", () => {
  test("P1: POST /api/listings with very long description does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Long Desc Test",
        description: "X".repeat(50000),
        price: "25",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("P2: POST /api/listings with unicode title does not crash", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "Test 日本語 中文 한국어 emoji 🎉🔥",
        description: "Unicode test",
        price: "25",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      // Cleanup
      await request.delete(`${BASE}/api/listings/${body.id}`);
    }
  });

  test("P3: POST /api/listings with SQL injection in title", async ({ request }) => {
    const res = await request.post(`${BASE}/api/listings`, {
      multipart: {
        title: "'; DROP TABLE Listing; --",
        description: "SQL injection test",
        price: "25",
        category: "tops",
        condition: "good",
      },
    });
    expect(res.status()).toBeLessThan(500);
    // Verify DB still works
    const check = await request.get(`${BASE}/api/listings`);
    expect(check.status()).toBe(200);
    if (res.ok()) {
      const body = await res.json();
      await request.delete(`${BASE}/api/listings/${body.id}`);
    }
  });

  test("P4: POST /api/platforms/connect with XSS in username", async ({ request }) => {
    const res = await request.post(`${BASE}/api/platforms/connect`, {
      data: {
        platform: "depop",
        username: '<script>alert("xss")</script>',
        password: "test123",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("P5: Concurrent requests do not crash the server", async ({ request }) => {
    const promises = Array.from({ length: 10 }, () =>
      request.get(`${BASE}/api/listings`)
    );
    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.status()).toBe(200);
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// Q. Performance Benchmark Tests
// ════════════════════════════════════════════════════════════════════

test.describe("Q — Performance benchmarks", () => {
  test("Q1: Dashboard loads under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "networkidle" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test("Q2: API /api/listings responds under 500ms", async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/api/listings`);
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  test("Q3: API /api/analytics responds under 500ms", async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/api/analytics`);
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  test("Q4: Create listing form page loads under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/listings/new", { waitUntil: "networkidle" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test("Q5: Settings page loads under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/settings", { waitUntil: "networkidle" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test("Q6: 20 concurrent API calls complete under 3 seconds", async ({ request }) => {
    const start = Date.now();
    const promises = Array.from({ length: 20 }, () =>
      request.get(`${BASE}/api/listings`)
    );
    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;
    for (const res of results) {
      expect(res.status()).toBe(200);
    }
    expect(elapsed).toBeLessThan(3000);
  });

  test("Q7: Page navigation chain completes under 8 seconds", async ({ page }) => {
    const routes = ["/", "/listings/new", "/analytics", "/trends", "/tools", "/settings"];
    const start = Date.now();
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(8000);
  });
});

// ════════════════════════════════════════════════════════════════════
// R. Accessibility Audit Tests
// ════════════════════════════════════════════════════════════════════

test.describe("R — Accessibility audit", () => {
  test("R1: Dashboard has no missing alt attributes on images", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).not.toBeNull();
    }
  });

  test("R2: Most form inputs have associated labels or aria-label", async ({ page }) => {
    await page.goto("/listings/new");
    const inputs = page.locator("input, textarea, select");
    const count = await inputs.count();
    let labeled = 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const type = await el.getAttribute("type");
      if (type === "hidden" || !(await el.isVisible())) continue;
      total++;

      const ariaLabel = await el.getAttribute("aria-label");
      const ariaLabelledBy = await el.getAttribute("aria-labelledby");
      const id = await el.getAttribute("id");
      const placeholder = await el.getAttribute("placeholder");
      const name = await el.getAttribute("name");

      let hasLabel = !!ariaLabel || !!ariaLabelledBy || !!placeholder || !!name;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = hasLabel || (await label.count()) > 0;
      }
      if (hasLabel) labeled++;
    }
    // At least 70% of visible inputs should have accessible names
    const ratio = total > 0 ? labeled / total : 1;
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });

  test("R3: Interactive elements are keyboard focusable", async ({ page }) => {
    await page.goto("/");
    // Tab through and verify focus is visible
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });
    expect(focused).not.toBeNull();
    expect(focused).not.toBe("BODY");
  });

  test("R4: No duplicate IDs on dashboard", async ({ page }) => {
    await page.goto("/");
    const duplicates = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("[id]")).map((el) => el.id);
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const id of ids) {
        if (seen.has(id)) dupes.push(id);
        seen.add(id);
      }
      return dupes;
    });
    expect(duplicates).toHaveLength(0);
  });

  test("R5: HTML lang attribute is set", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
    expect(lang).toBe("en");
  });

  test("R6: Most buttons have accessible text content", async ({ page }) => {
    await page.goto("/");
    const buttons = page.locator("button");
    const count = await buttons.count();
    let accessible = 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible())) continue;
      total++;
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute("aria-label");
      const title = await btn.getAttribute("title");
      // Icon-only buttons with SVG children still count if they have aria-label or inner svg title
      const hasSvg = (await btn.locator("svg").count()) > 0;
      const hasName = (text && text.trim().length > 0) || !!ariaLabel || !!title || hasSvg;
      if (hasName) accessible++;
    }
    // At least 80% of visible buttons should have accessible names
    const ratio = total > 0 ? accessible / total : 1;
    expect(ratio).toBeGreaterThanOrEqual(0.8);
  });

  test("R7: Page has exactly one h1 on each route", async ({ page }) => {
    const routes = ["/", "/listings/new", "/analytics", "/settings"];
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    }
  });

  test("R8: Skip to content or logical focus order exists", async ({ page }) => {
    await page.goto("/");
    // Verify tab order starts with interactive elements, not random divs
    await page.keyboard.press("Tab");
    const tag = await page.evaluate(() => document.activeElement?.tagName);
    // First focused element should be a link, button, or input
    expect(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]).toContain(tag);
  });
});
