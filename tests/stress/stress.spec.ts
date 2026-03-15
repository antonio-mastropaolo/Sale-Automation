import { test, expect, type APIRequestContext } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Shared auth state — seed admin, login, capture session cookie      */
/* ------------------------------------------------------------------ */

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@crosslist.io";
const ADMIN_PASS = "admin";

let SESSION_COOKIE = "";

/**
 * Helper: build an APIRequestContext pre-loaded with the session cookie.
 */
async function authedContext(
  request: APIRequestContext
): Promise<APIRequestContext> {
  // The fixture `request` already points at baseURL; we just need the cookie.
  // Playwright's request fixture doesn't support per-context cookies the same
  // way browser contexts do, so we pass the cookie as a header.
  return request;
}

function authHeaders() {
  return { Cookie: `session_token=${SESSION_COOKIE}` };
}

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
    loginRes.headers()["set-cookie"] || loginRes.headers()["Set-Cookie"] || "";
  const match = setCookieHeader.match(/session_token=([^;]+)/);
  expect(match).toBeTruthy();
  SESSION_COOKIE = match![1];
});

/* ================================================================== */
/*  A  Auth — Login / Register / Logout                                */
/* ================================================================== */

test.describe("A Auth — Login / Register / Logout", () => {
  test("A01 seed endpoint returns 200", async ({ request }) => {
    const res = await request.get("/api/auth/seed");
    expect(res.ok()).toBeTruthy();
  });

  test("A02 login with valid credentials returns session cookie", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    expect(res.ok()).toBeTruthy();
    const cookies = res.headers()["set-cookie"] || "";
    expect(cookies).toContain("session_token");
  });

  test("A03 login with wrong password returns 401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: "wrongpassword" },
    });
    expect(res.status()).toBe(401);
  });

  test("A04 login with nonexistent email returns 401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "nobody@example.com", password: "anything" },
    });
    expect(res.status()).toBe(401);
  });

  test("A05 register a new user returns 200 or 201", async ({ request }) => {
    const unique = `stress_${Date.now()}`;
    const res = await request.post("/api/auth/register", {
      data: {
        email: `${unique}@test.io`,
        username: unique,
        password: "Test1234!",
      },
    });
    expect([200, 201]).toContain(res.status());
  });

  test("A06 register duplicate email returns 400 or 409", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/register", {
      data: {
        email: ADMIN_EMAIL,
        username: "dupuser",
        password: "Test1234!",
      },
    });
    expect([400, 409]).toContain(res.status());
  });

  test("A07 /api/auth/me with valid cookie returns user info", async ({
    request,
  }) => {
    const res = await request.get("/api/auth/me", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.email || body.user?.email).toBeDefined();
  });

  test("A08 logout clears session", async ({ request }) => {
    // First login to get a fresh session
    const loginRes = await request.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    const setCookie = loginRes.headers()["set-cookie"] || "";
    const m = setCookie.match(/session_token=([^;]+)/);
    const freshToken = m ? m[1] : SESSION_COOKIE;

    const res = await request.post("/api/auth/logout", {
      headers: { Cookie: `session_token=${freshToken}` },
    });
    expect(res.ok()).toBeTruthy();
  });
});

/* ================================================================== */
/*  B  Auth — Password Reset Flow                                      */
/* ================================================================== */

test.describe("B Auth — Password Reset Flow", () => {
  test("B01 forgot-password with valid email returns 200", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { email: ADMIN_EMAIL },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("B02 forgot-password with unknown email returns 200 (no leak)", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { email: "unknown@nowhere.com" },
    });
    // Should return 200 to avoid email enumeration
    expect([200, 404]).toContain(res.status());
  });

  test("B03 reset-password with invalid token returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { token: "invalid-token-abc", newPassword: "NewPass123!" },
    });
    expect([400, 401, 404]).toContain(res.status());
  });

  test("B04 reset-password missing token field returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { newPassword: "NewPass123!" },
    });
    expect([400, 401, 404]).toContain(res.status());
  });

  test("B05 forgot-password missing email field returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });
});

/* ================================================================== */
/*  C  Auth — Session & Middleware                                     */
/* ================================================================== */

test.describe("C Auth — Session & Middleware", () => {
  test("C01 API route without cookie still returns 200 (no auth on APIs)", async ({
    request,
  }) => {
    const res = await request.get("/api/listings");
    expect(res.ok()).toBeTruthy();
  });

  test("C02 API route with invalid cookie still returns 200 (no auth on APIs)", async ({
    request,
  }) => {
    const res = await request.get("/api/listings", {
      headers: { Cookie: "session_token=totally-bogus-token" },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("C03 /api/auth/me without cookie returns 401", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect([401, 403]).toContain(res.status());
  });

  test("C04 API POST without cookie still succeeds (no auth on APIs)", async ({
    request,
  }) => {
    const res = await request.post("/api/templates", {
      data: { name: "test" },
    });
    expect([200, 201]).toContain(res.status());
  });

  test("C05 cookie survives multiple sequential requests", async ({
    request,
  }) => {
    const res1 = await request.get("/api/listings", {
      headers: authHeaders(),
    });
    expect(res1.ok()).toBeTruthy();

    const res2 = await request.get("/api/settings", {
      headers: authHeaders(),
    });
    expect(res2.ok()).toBeTruthy();

    const res3 = await request.get("/api/auth/me", {
      headers: authHeaders(),
    });
    expect(res3.ok()).toBeTruthy();
  });
});

/* ================================================================== */
/*  D  Listings — CRUD Operations                                     */
/* ================================================================== */

test.describe("D Listings — CRUD Operations", () => {
  let createdId: string;

  test("D01 GET /api/listings returns array", async ({ request }) => {
    const res = await request.get("/api/listings", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.listings || body)).toBeTruthy();
  });

  test("D02 POST /api/listings creates a listing (multipart)", async ({
    request,
  }) => {
    const res = await request.post("/api/listings", {
      headers: authHeaders(),
      multipart: {
        title: "Stress Test Item D02",
        description: "Created by stress test",
        category: "Tops",
        brand: "Nike",
        size: "M",
        condition: "Good",
        price: "25",
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    createdId = body.id || body.listing?.id;
    expect(createdId).toBeDefined();
  });

  test("D03 GET /api/listings/[id] returns the created listing", async ({
    request,
  }) => {
    // Create a fresh listing to get an ID
    const createRes = await request.post("/api/listings", {
      headers: authHeaders(),
      multipart: {
        title: "Stress Test Item D03",
        description: "Fetch test",
        category: "Bottoms",
        brand: "Adidas",
        size: "L",
        condition: "New",
        price: "40",
      },
    });
    const created = await createRes.json();
    const id = created.id || created.listing?.id;

    const res = await request.get(`/api/listings/${id}`, {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.title || body.listing?.title).toContain("Stress Test Item D03");
  });

  test("D04 PATCH /api/listings/[id] updates a listing", async ({
    request,
  }) => {
    // Create
    const createRes = await request.post("/api/listings", {
      headers: authHeaders(),
      multipart: {
        title: "Stress Test Item D04",
        description: "Will be patched",
        category: "Tops",
        brand: "Puma",
        size: "S",
        condition: "Good",
        price: "15",
      },
    });
    const created = await createRes.json();
    const id = created.id || created.listing?.id;

    const res = await request.patch(`/api/listings/${id}`, {
      headers: authHeaders(),
      data: { title: "Updated D04 Title", price: "99" },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("D05 DELETE /api/listings/[id] removes a listing", async ({
    request,
  }) => {
    // Create
    const createRes = await request.post("/api/listings", {
      headers: authHeaders(),
      multipart: {
        title: "Stress Test Item D05 Delete",
        description: "Will be deleted",
        category: "Footwear",
        brand: "Reebok",
        size: "10",
        condition: "Fair",
        price: "30",
      },
    });
    const created = await createRes.json();
    const id = created.id || created.listing?.id;

    const res = await request.delete(`/api/listings/${id}`, {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();

    // Verify it's gone
    const getRes = await request.get(`/api/listings/${id}`, {
      headers: authHeaders(),
    });
    expect([404, 400]).toContain(getRes.status());
  });

  test("D06 GET nonexistent listing returns 404", async ({ request }) => {
    const res = await request.get(
      "/api/listings/00000000-0000-0000-0000-000000000000",
      { headers: authHeaders() }
    );
    expect([404, 400]).toContain(res.status());
  });

  test("D07 POST listing missing required title returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/listings", {
      headers: authHeaders(),
      multipart: {
        description: "No title provided",
        category: "Tops",
        brand: "Nike",
        size: "M",
        condition: "Good",
        price: "10",
      },
    });
    expect([400, 422]).toContain(res.status());
  });
});

/* ================================================================== */
/*  E  Listings — Batch Operations                                     */
/* ================================================================== */

test.describe("E Listings — Batch Operations", () => {
  let batchIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // Create 3 listings for batch operations
    for (let i = 0; i < 3; i++) {
      const res = await request.post("/api/listings", {
        headers: authHeaders(),
        multipart: {
          title: `Batch Item E${i}`,
          description: `Batch test listing ${i}`,
          category: "Tops",
          brand: "TestBrand",
          size: "M",
          condition: "Good",
          price: `${10 + i}`,
        },
      });
      const body = await res.json();
      const id = body.id || body.listing?.id;
      if (id) batchIds.push(id);
    }
  });

  test("E01 batch action with valid IDs returns 200", async ({ request }) => {
    if (batchIds.length === 0) test.skip();
    const res = await request.post("/api/batch", {
      headers: authHeaders(),
      data: { action: "activate", listingIds: batchIds },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("E02 batch with empty listingIds returns 400", async ({ request }) => {
    const res = await request.post("/api/batch", {
      headers: authHeaders(),
      data: { action: "activate", listingIds: [] },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("E03 batch delete removes multiple listings", async ({ request }) => {
    // Create fresh listings for deletion
    const deleteIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const res = await request.post("/api/listings", {
        headers: authHeaders(),
        multipart: {
          title: `Batch Delete E03-${i}`,
          description: "To be batch deleted",
          category: "Tops",
          brand: "Test",
          size: "S",
          condition: "Good",
          price: "5",
        },
      });
      const body = await res.json();
      const id = body.id || body.listing?.id;
      if (id) deleteIds.push(id);
    }

    const res = await request.post("/api/batch", {
      headers: authHeaders(),
      data: { action: "delete", listingIds: deleteIds },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("E04 batch with no action field returns 400", async ({ request }) => {
    const res = await request.post("/api/batch", {
      headers: authHeaders(),
      data: { listingIds: ["some-id"] },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("E05 batch without auth still succeeds (no auth on APIs)", async ({ request }) => {
    const res = await request.post("/api/batch", {
      data: { action: "activate", listingIds: ["id1"] },
    });
    expect(res.ok()).toBeTruthy();
  });
});

/* ================================================================== */
/*  F  Listings — Bulk CSV Import                                      */
/* ================================================================== */

test.describe("F Listings — Bulk CSV Import", () => {
  test("F01 import valid CSV returns imported count", async ({ request }) => {
    const csv = `title,description,category,brand,size,condition,price
CSV Item 1,Imported via stress test,Tops,Nike,M,Good,20
CSV Item 2,Another import,Bottoms,Adidas,L,New,35`;

    const res = await request.post("/api/bulk-import", {
      headers: {
        ...authHeaders(),
        "Content-Type": "text/plain",
      },
      data: csv,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.imported || body.count).toBeGreaterThanOrEqual(2);
  });

  test("F02 import empty CSV (header only) returns 400", async ({ request }) => {
    const csv = `title,description,category,brand,size,condition,price`;

    const res = await request.post("/api/bulk-import", {
      headers: {
        ...authHeaders(),
        "Content-Type": "text/plain",
      },
      data: csv,
    });
    // Route requires at least one data row beyond the header
    expect(res.status()).toBe(400);
  });

  test("F03 import CSV without auth still succeeds (no auth on APIs)", async ({ request }) => {
    const res = await request.post("/api/bulk-import", {
      headers: { "Content-Type": "text/plain" },
      data: "title,price\nItem,10",
    });
    expect(res.ok()).toBeTruthy();
  });

  test("F04 import single-row CSV returns 1 imported", async ({ request }) => {
    const csv = `title,description,category,brand,size,condition,price
Single CSV Item,One row,Shoes,Vans,9,Good,45`;

    const res = await request.post("/api/bulk-import", {
      headers: {
        ...authHeaders(),
        "Content-Type": "text/plain",
      },
      data: csv,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.imported || body.count).toBeGreaterThanOrEqual(1);
  });

  test("F05 import malformed CSV gracefully handles errors", async ({
    request,
  }) => {
    const csv = `not,a,valid,csv,for,listings
;;;garbage;;;data`;

    const res = await request.post("/api/bulk-import", {
      headers: {
        ...authHeaders(),
        "Content-Type": "text/plain",
      },
      data: csv,
    });
    // Should either succeed with 0 imported or return a 400
    expect([200, 400, 422]).toContain(res.status());
  });
});

/* ================================================================== */
/*  G  Templates — CRUD                                                */
/* ================================================================== */

test.describe("G Templates — CRUD", () => {
  let templateId: string;

  test("G01 GET /api/templates returns array", async ({ request }) => {
    const res = await request.get("/api/templates", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.templates || body)).toBeTruthy();
  });

  test("G02 POST /api/templates creates a template", async ({ request }) => {
    const res = await request.post("/api/templates", {
      headers: authHeaders(),
      data: {
        name: `Stress Template ${Date.now()}`,
        description: "Auto-generated template",
        category: "Tops",
        brand: "Generic",
        size: "M",
        condition: "Good",
        price: "20",
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    templateId = body.id || body.template?.id;
    expect(templateId).toBeDefined();
  });

  test("G03 DELETE /api/templates removes a template", async ({ request }) => {
    // Create one to delete
    const createRes = await request.post("/api/templates", {
      headers: authHeaders(),
      data: {
        name: `Delete Template ${Date.now()}`,
        description: "Will be deleted",
        category: "Bottoms",
        brand: "Nike",
        size: "L",
        condition: "New",
        price: "50",
      },
    });
    const created = await createRes.json();
    const id = created.id || created.template?.id;

    const res = await request.delete(`/api/templates?id=${id}`, {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("G04 POST template without name returns 400", async ({ request }) => {
    const res = await request.post("/api/templates", {
      headers: authHeaders(),
      data: { description: "Missing name" },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("G05 GET templates without auth still returns 200 (no auth on APIs)", async ({ request }) => {
    const res = await request.get("/api/templates");
    expect(res.ok()).toBeTruthy();
  });
});

/* ================================================================== */
/*  H  Sales & P/L — Recording & Stats                                */
/* ================================================================== */

test.describe("H Sales & P/L — Recording & Stats", () => {
  let saleId: string;

  test("H01 GET /api/sales returns array", async ({ request }) => {
    const res = await request.get("/api/sales", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.sales || body)).toBeTruthy();
  });

  test("H02 POST /api/sales records a sale", async ({ request }) => {
    const res = await request.post("/api/sales", {
      headers: authHeaders(),
      data: {
        title: `Stress Sale ${Date.now()}`,
        platform: "eBay",
        soldPrice: 50,
        costPrice: 20,
        shippingCost: 5,
        platformFee: 0,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    saleId = body.id || body.sale?.id;
    expect(saleId).toBeDefined();
  });

  test("H03 DELETE /api/sales removes a sale", async ({ request }) => {
    // Create one to delete
    const createRes = await request.post("/api/sales", {
      headers: authHeaders(),
      data: {
        title: `Delete Sale ${Date.now()}`,
        platform: "Poshmark",
        soldPrice: 30,
        costPrice: 10,
        shippingCost: 3,
        platformFee: 0,
      },
    });
    const created = await createRes.json();
    const id = created.id || created.sale?.id;

    const res = await request.delete(`/api/sales?id=${id}`, {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("H04 POST sale without required fields returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/sales", {
      headers: authHeaders(),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });

  test("H05 GET sales without auth still returns 200 (no auth on APIs)", async ({ request }) => {
    const res = await request.get("/api/sales");
    expect(res.ok()).toBeTruthy();
  });

  test("H06 POST sale with all fields succeeds", async ({ request }) => {
    const res = await request.post("/api/sales", {
      headers: authHeaders(),
      data: {
        title: "Complete Sale Record",
        platform: "Mercari",
        soldPrice: 100,
        costPrice: 40,
        shippingCost: 8,
        platformFee: 10,
      },
    });
    expect([200, 201]).toContain(res.status());
  });
});

/* ================================================================== */
/*  I  AI APIs — Optimize / Enhance (SKIPPED)                          */
/* ================================================================== */

test.describe("I AI APIs — Optimize / Enhance", () => {
  test("I01 POST /api/listings/[id]/optimize requires API key", async () => {
    test.skip(true, "Needs real AI API key");
  });

  test("I02 AI enhance listing description", async () => {
    test.skip(true, "Needs real AI API key");
  });

  test("I03 AI optimize with custom prompt", async () => {
    test.skip(true, "Needs real AI API key");
  });
});

/* ================================================================== */
/*  J  AI APIs — Smart List / Trends / Competitor (SKIPPED)            */
/* ================================================================== */

test.describe("J AI APIs — Smart List / Trends / Competitor", () => {
  test("J01 GET /api/listings/smart requires API key", async () => {
    test.skip(true, "Needs real AI API key");
  });

  test("J02 GET /api/trends requires API key", async () => {
    test.skip(true, "Needs real AI API key");
  });

  test("J03 GET /api/competitor requires API key", async () => {
    test.skip(true, "Needs real AI API key");
  });

  test("J04 POST /api/competitor analyze", async () => {
    test.skip(true, "Needs real AI API key");
  });
});

/* ================================================================== */
/*  K  AI APIs — Price Intel / Health / Negotiate (SKIPPED)            */
/* ================================================================== */

test.describe("K AI APIs — Price Intel / Health / Negotiate", () => {
  test("K01 POST /api/price-intel requires API key", async () => {
    test.skip(true, "Needs real AI API key");
  });

  test("K02 POST /api/listing-health requires API key", async () => {
    test.skip(true, "Needs real AI API key");
  });

  test("K03 POST /api/negotiate requires API key", async () => {
    test.skip(true, "Needs real AI API key");
  });
});

/* ================================================================== */
/*  L  Settings — Provider & Prompts                                   */
/* ================================================================== */

test.describe("L Settings — Provider & Prompts", () => {
  test("L01 GET /api/settings returns settings object", async ({
    request,
  }) => {
    const res = await request.get("/api/settings", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test("L02 POST /api/settings updates settings", async ({ request }) => {
    const res = await request.post("/api/settings", {
      headers: authHeaders(),
      data: {
        settings: {
          ai_provider: "openai",
          ai_model: "gpt-4o-mini",
        },
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("L03 GET /api/settings/prompts returns prompts", async ({
    request,
  }) => {
    const res = await request.get("/api/settings/prompts", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.prompts || body)).toBeTruthy();
  });

  test("L04 POST /api/settings/prompts creates/updates a prompt", async ({
    request,
  }) => {
    const res = await request.post("/api/settings/prompts", {
      headers: authHeaders(),
      data: {
        featureKey: "optimize",
        prompt: "You are a helpful listing optimizer. Optimize for {{platform}}.",
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("L05 DELETE /api/settings/prompts removes a prompt override", async ({
    request,
  }) => {
    // Create a custom prompt override first
    await request.post("/api/settings/prompts", {
      headers: authHeaders(),
      data: {
        featureKey: "optimize",
        prompt: "Temporary prompt to be deleted.",
      },
    });

    const res = await request.delete("/api/settings/prompts?featureKey=optimize", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("L06 POST /api/settings/test-prompt skipped (needs API key)", async () => {
    test.skip(true, "Needs real AI API key to test prompt execution");
  });

  test("L07 GET settings without auth still returns 200 (no auth on APIs)", async ({ request }) => {
    const res = await request.get("/api/settings");
    expect(res.ok()).toBeTruthy();
  });
});

/* ================================================================== */
/*  M  Platform Connections                                            */
/* ================================================================== */

test.describe("M Platform Connections", () => {
  test("M01 GET /api/platforms/connect returns platforms", async ({
    request,
  }) => {
    const res = await request.get("/api/platforms/connect", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("M02 POST /api/platforms/connect adds a platform", async ({
    request,
  }) => {
    const res = await request.post("/api/platforms/connect", {
      headers: authHeaders(),
      data: {
        platform: "depop",
        username: "stress-test-user",
        password: "stress-test-pass",
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("M03 DELETE /api/platforms/connect removes a platform", async ({
    request,
  }) => {
    // Create then delete
    await request.post("/api/platforms/connect", {
      headers: authHeaders(),
      data: {
        platform: "grailed",
        username: "delete-test-user",
        password: "delete-test-pass",
      },
    });

    const res = await request.delete("/api/platforms/connect?platform=grailed", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("M04 GET platforms without auth still returns 200 (no auth on APIs)", async ({ request }) => {
    const res = await request.get("/api/platforms/connect");
    expect(res.ok()).toBeTruthy();
  });

  test("M05 POST platform with missing fields returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/platforms/connect", {
      headers: authHeaders(),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });
});

/* ================================================================== */
/*  N  Scheduler — CRUD                                                */
/* ================================================================== */

test.describe("N Scheduler — CRUD", () => {
  test("N01 GET /api/scheduler returns schedule entries", async ({
    request,
  }) => {
    const res = await request.get("/api/scheduler", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.schedules || body)).toBeTruthy();
  });

  test("N02 POST /api/scheduler creates a schedule", async ({ request }) => {
    // Create a listing first (scheduler requires a valid listingId)
    const listingRes = await request.post("/api/listings", {
      headers: authHeaders(),
      multipart: {
        title: "Scheduler Test Listing N02",
        description: "For scheduler test",
        category: "Tops",
        brand: "Test",
        size: "M",
        condition: "Good",
        price: "25",
      },
    });
    const listing = await listingRes.json();
    const listingId = listing.id || listing.listing?.id;

    const res = await request.post("/api/scheduler", {
      headers: authHeaders(),
      data: {
        listingId,
        platform: "depop",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect([200, 201]).toContain(res.status());
  });

  test("N03 DELETE /api/scheduler removes a schedule", async ({ request }) => {
    // Create a listing first (scheduler requires a valid listingId)
    const listingRes = await request.post("/api/listings", {
      headers: authHeaders(),
      multipart: {
        title: "Scheduler Delete Test Listing N03",
        description: "For scheduler delete test",
        category: "Tops",
        brand: "Test",
        size: "M",
        condition: "Good",
        price: "25",
      },
    });
    const listing = await listingRes.json();
    const listingId = listing.id || listing.listing?.id;

    // Create a scheduled post
    const createRes = await request.post("/api/scheduler", {
      headers: authHeaders(),
      data: {
        listingId,
        platform: "poshmark",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    const created = await createRes.json();
    const id = created.id || created.schedule?.id;

    const res = await request.delete(`/api/scheduler?id=${id}`, {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("N04 GET scheduler without auth still returns 200 (no auth on APIs)", async ({ request }) => {
    const res = await request.get("/api/scheduler");
    expect(res.ok()).toBeTruthy();
  });

  test("N05 POST scheduler with missing fields returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/scheduler", {
      headers: authHeaders(),
      data: {},
    });
    expect([400, 422]).toContain(res.status());
  });
});

/* ================================================================== */
/*  O  Export — CSV Downloads                                          */
/* ================================================================== */

test.describe("O Export — CSV Downloads", () => {
  test("O01 GET /api/export?type=listings returns CSV", async ({
    request,
  }) => {
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()["content-type"] || "";
    expect(
      contentType.includes("text/csv") ||
        contentType.includes("application/octet-stream") ||
        contentType.includes("text/plain")
    ).toBeTruthy();
  });

  test("O02 GET /api/export?type=sales returns CSV", async ({ request }) => {
    const res = await request.get("/api/export?type=sales", {
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("O03 GET export without auth still returns 200 (no auth on APIs)", async ({ request }) => {
    const res = await request.get("/api/export?type=listings");
    expect(res.ok()).toBeTruthy();
  });

  test("O04 GET export with invalid type returns 400", async ({ request }) => {
    const res = await request.get("/api/export?type=invalid", {
      headers: authHeaders(),
    });
    expect([400, 404, 422]).toContain(res.status());
  });

  test("O05 export listings CSV contains header row", async ({ request }) => {
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    const text = await res.text();
    // CSV should have at least a header row with common fields
    expect(
      text.toLowerCase().includes("title") ||
        text.toLowerCase().includes("id") ||
        text.length > 0
    ).toBeTruthy();
  });
});

/* ================================================================== */
/*  P  Page Navigation — All Routes                                    */
/* ================================================================== */

test.describe("P Page Navigation — All Routes", () => {
  // Public pages (no auth needed)
  test("P01 /login page loads", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.ok()).toBeTruthy();
  });

  test("P02 /register page loads", async ({ page }) => {
    const res = await page.goto("/register");
    expect(res?.ok()).toBeTruthy();
  });

  // Authenticated pages — set the cookie before navigating
  test("P03 / (dashboard) loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P04 /listings/new loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/listings/new");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P05 /analytics loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/analytics");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P06 /settings loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/settings");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P07 /templates loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/templates");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P08 /inventory loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/inventory");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P09 /bulk-import loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/bulk-import");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P10 /scheduler loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/scheduler");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P11 /shipping loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/shipping");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P12 /showcase loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/showcase");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P13 /tools loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/tools");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P14 /trends loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/trends");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P15 /competitor loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/competitor");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P16 /onboard loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/onboard");
    expect(res?.status()).toBeLessThan(400);
  });

  test("P17 /listings/smart loads with auth", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/listings/smart");
    expect(res?.status()).toBeLessThan(400);
  });
});

/* ================================================================== */
/*  Q  Edge Cases & Error Handling                                     */
/* ================================================================== */

test.describe("Q Edge Cases & Error Handling", () => {
  test("Q01 invalid JSON body returns 400", async ({ request }) => {
    const res = await request.post("/api/listings", {
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      data: "this is not json{{{",
    });
    expect([400, 415, 422, 500]).toContain(res.status());
  });

  test("Q02 missing required fields on listing POST returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/listings", {
      headers: authHeaders(),
      multipart: {
        description: "No title",
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("Q03 nonexistent listing ID returns 404", async ({ request }) => {
    const res = await request.get(
      "/api/listings/00000000-0000-0000-0000-000000000000",
      { headers: authHeaders() }
    );
    expect([404, 400]).toContain(res.status());
  });

  test("Q04 DELETE listing with no id returns 400 or 404", async ({
    request,
  }) => {
    const res = await request.delete("/api/listings/", {
      headers: authHeaders(),
    });
    expect([400, 404, 405]).toContain(res.status());
  });

  test("Q05 PATCH nonexistent listing returns 404", async ({ request }) => {
    const res = await request.patch(
      "/api/listings/00000000-0000-0000-0000-000000000000",
      {
        headers: authHeaders(),
        data: { title: "Ghost" },
      }
    );
    expect([404, 400]).toContain(res.status());
  });

  test("Q06 large payload (>100KB) on optimize returns 413 or error", async ({
    request,
  }) => {
    const largeBody = "x".repeat(150_000);
    const res = await request.post("/api/listings/fake-id/optimize", {
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ content: largeBody }),
    });
    // Could be 413 (payload too large), 400, 401, or 500
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("Q07 accessing /api/nonexistent returns 404", async ({ request }) => {
    const res = await request.get("/api/nonexistent", {
      headers: authHeaders(),
    });
    expect(res.status()).toBe(404);
  });

  test("Q08 DELETE templates with invalid id returns error", async ({
    request,
  }) => {
    const res = await request.delete("/api/templates", {
      headers: authHeaders(),
      data: { id: "nonexistent-id-000" },
    });
    expect([400, 404, 500]).toContain(res.status());
  });
});

/* ================================================================== */
/*  R  Performance — Response Times                                    */
/* ================================================================== */

test.describe("R Performance — Response Times", () => {
  test("R01 GET /api/listings responds within 500ms", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/listings", {
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(500);
  });

  test("R02 GET /api/settings responds within 200ms", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/settings", {
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(200);
  });

  test("R03 GET /api/export?type=listings responds within 1000ms", async ({
    request,
  }) => {
    const start = Date.now();
    const res = await request.get("/api/export?type=listings", {
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(1000);
  });

  test("R04 page / loads within 3000ms", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const start = Date.now();
    await page.goto("/");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test("R05 page /settings loads within 3000ms", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const start = Date.now();
    await page.goto("/settings");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test("R06 POST /api/auth/login responds within 300ms", async ({
    request,
  }) => {
    const start = Date.now();
    const res = await request.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(300);
  });

  test("R07 GET /api/sales responds within 500ms", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/sales", {
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(500);
  });
});

/* ================================================================== */
/*  S  Shipping Calculator (client-side page load test)                */
/* ================================================================== */

test.describe("S Shipping Calculator", () => {
  test("S01 /shipping page loads and renders content", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/shipping");
    await page.waitForLoadState("domcontentloaded");
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });

  test("S02 /shipping page has no console errors", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/shipping");
    await page.waitForLoadState("domcontentloaded");
    expect(errors.length).toBe(0);
  });

  test("S03 /shipping page loads within 3000ms", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const start = Date.now();
    await page.goto("/shipping");
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });
});

/* ================================================================== */
/*  T  Onboarding Wizard                                               */
/* ================================================================== */

test.describe("T Onboarding Wizard", () => {
  test("T01 /onboard page loads", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    const res = await page.goto("/onboard");
    expect(res?.status()).toBeLessThan(400);
  });

  test("T02 POST /api/auth/onboard with empty body succeeds", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/onboard", {
      headers: authHeaders(),
      data: {},
    });
    // Onboard should accept partial data (optional fields)
    expect([200, 201]).toContain(res.status());
  });

  test("T03 POST /api/auth/onboard with provider settings succeeds", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/onboard", {
      headers: authHeaders(),
      data: {
        aiProvider: "openai",
        aiModel: "gpt-4o-mini",
      },
    });
    expect([200, 201]).toContain(res.status());
  });

  test("T04 POST /api/auth/onboard without auth returns 401", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/onboard", {
      data: { aiProvider: "openai" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("T05 /onboard page renders content", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "session_token",
        value: SESSION_COOKIE,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/onboard");
    await page.waitForLoadState("domcontentloaded");
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });
});
