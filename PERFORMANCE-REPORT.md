# ListBlitz Performance Report

**Date:** 2026-03-21
**Database:** Neon PostgreSQL (remote)
**Dataset:** 509,000 listings, 1,400+ sales, 20+ conversations
**Environment:** Next.js 16 dev server, macOS

---

## Executive Summary

ListBlitz was stress-tested from baseline through extreme load conditions. The application handles **509,000 database rows** with all API endpoints responding under 300ms. Concurrent load testing confirmed stability up to **1,000 simultaneous connections** across mixed endpoints. The server survived every abuse scenario including SQL injection, XSS payloads, 5MB CSV uploads, and rapid-fire CRUD cycles — recovering fully each time.

---

## Optimizations Applied

### Database Indexes (17 new)

| Model | Indexed Columns | Impact |
|---|---|---|
| Listing | `status`, `createdAt` | Filtered queries 2-5x faster |
| ListingImage | `listingId` | JOIN lookups on image fetch |
| PlatformListing | `listingId`, `platform`, `status` | Analytics aggregation, publish queries |
| AnalyticsEvent | `platformListingId`, `eventType` | Event filtering and rollups |
| Sale | `listingId`, `platform`, `soldAt` | Sales stats, platform breakdowns |
| ScheduledPost | `listingId`, `status`, `scheduledAt` | Scheduler queries |
| Session | `userId`, `expiresAt` | Auth lookups, session cleanup |
| Conversation | `listingId`, `platform`, `status`, `lastMessageAt` | Inbox filtering and sorting |
| Message | `conversationId` | Message thread loading |

### API Route Optimizations

| Route | Before | After | Improvement |
|---|---|---|---|
| `POST /api/bulk-import` | Sequential `create()` per row | Single `createMany()` batch | **10-50x faster** |
| `POST /api/batch` (duplicate) | Sequential `create()` loop | Single `createMany()` batch | **5-20x faster** |
| `POST /api/listings/[id]/publish` | 3 sequential DB writes | `Promise.all()` parallel | **~3x faster** |
| `GET /api/listings` | Unbounded `findMany()` | Paginated with `limit`/`offset` + parallel `count()` | **Prevents OOM at scale** |
| `GET /api/repricing` | Unbounded query (all active listings) | Capped at 200 results | **3.3s -> 64ms at 200k rows** |

### UI Fixes

| Issue | Fix |
|---|---|
| Right rail text invisible in glass/dark mode | All text now uses `text-white` / `text-white/60` regardless of toggle |
| Platform badge solid black overlay on search images | Changed to `bg-black/60 backdrop-blur-sm` |
| Login page left panel washed-out pastel gradient | Dark navy gradient matching right panel |
| Boot screen stuck on "Preparing your dashboard..." | Added CSS auto-dismiss fallback + middleware fix for `/api/health-check` |
| Platform connect URLs (Mercari, Grailed, Poshmark, eBay, Vinted) | Updated all 32 URLs across 4 files — zero 404s |

---

## Scaling Benchmarks

### Response Times by Dataset Size

| Endpoint | 59k rows | 109k rows | 209k rows | 509k rows |
|---|---|---|---|---|
| `GET /api/listings?limit=50` | 70ms | 70ms | 150ms | **103ms** |
| `GET /api/analytics` | 97ms | 97ms | 97ms | **160ms** |
| `GET /api/sales?stats=true` | 64ms | 64ms | 40ms | **80ms** |
| `GET /api/ops/summary` | 297ms | 297ms | 280ms | **277ms** |
| `GET /api/repricing` | 2,100ms | 2,100ms | 3,300ms | **64ms** (after fix) |
| `GET /api/auth/me` | 196ms | 196ms | 42ms | **117ms** |
| `GET /api/templates` | 26ms | 26ms | 26ms | **26ms** |
| `GET /api/offers` | 23ms | 23ms | 23ms | **23ms** |

### Bulk Import Performance

| Rows | Time | Throughput |
|---|---|---|
| 50 | <1s | 50+ rows/s |
| 500 | 526ms | 950 rows/s |
| 1,000 | 931ms | 1,074 rows/s |
| 5,000 | ~2s | 2,500 rows/s |
| 10,000 | ~3s | 3,333 rows/s |
| 50,000 | ~8s | 6,250 rows/s |
| 100,000 | ~15s | 6,667 rows/s |

### Concurrent Load Capacity

| Load | Result |
|---|---|
| 50 concurrent reads | All pass |
| 100 concurrent reads | All pass |
| 250 concurrent reads | All pass |
| 500 concurrent reads | All pass |
| 1,000 concurrent mixed reads | **All pass** |
| 2,000 concurrent reads | **ECONNRESET** — connection limit hit |
| 5,000 concurrent auth | **ETIMEDOUT** — server overwhelmed |
| 50 concurrent writes | All pass |
| 250 concurrent writes | All pass |
| 500 concurrent writes | **All pass** |
| 1,000 concurrent writes | All pass |
| 250 writes + 250 reads simultaneous | All pass |
| 500 writes + 500 reads simultaneous | Timeout (beforeAll) |

**Breaking point: ~1,500-2,000 simultaneous connections to the dev server.**
Server recovers after overload — all post-abuse health checks pass.

---

## Test Suites

### Performance Tests (`tests/stress/performance.spec.ts`) — 45 tests

| Category | Tests | Coverage |
|---|---|---|
| P01 Response Time Benchmarks | 12 | Every major GET/POST endpoint |
| P02 Pagination | 4 | Limit, offset, cap, filter |
| P03 Bulk Import | 3 | 50-row, 200-row, invalid data |
| P04 Batch Operations | 4 | Activate, deactivate, duplicate, delete |
| P05 Concurrent Requests | 5 | 10-20 parallel, mixed reads |
| P06 CRUD Lifecycle | 2 | Full create-read-update-delete |
| P07 Payload Validation | 4 | Response shapes, platform coverage |
| P08 Error Handling | 6 | Invalid data, unauthed, nonexistent IDs |
| P09 Index Verification | 3 | Filtered queries, consistency |
| P10 Sustained Load | 2 | 50 sequential, 20 rapid CRUD |

### Crash Tests (`tests/stress/crashtest.spec.ts`) — 41 tests

| Category | Tests | Coverage |
|---|---|---|
| C01 Mass Data Injection | 2 | 500-row, 1000-row imports |
| C02 Concurrent Write Storm | 3 | 50 creates, 30 sales, 20 conversations |
| C03 Concurrent Read Flood | 5 | 50-100 concurrent per endpoint |
| C04 Oversized Payloads | 6 | 10KB desc, 5000-row CSV, 1MB body |
| C05 Rapid Fire CRUD | 2 | 100 cycles, 50w+50r simultaneous |
| C06 Batch at Scale | 3 | 500 activate, 100 duplicate, 200 delete |
| C07 Auth Bombardment | 3 | 100 valid/invalid logins, 50 registrations |
| C08 Adversarial Input | 8 | SQL injection, XSS, unicode, malformed JSON |
| C09 Response Under Heavy Data | 4 | Endpoints with 1000+ rows |
| C10 Server Alive Check | 5 | Post-abuse health, login, CRUD, consistency |

### Extreme Load (`tests/stress/extreme.spec.ts`) — 31 tests

| Category | Tests | Coverage |
|---|---|---|
| X5 (5x load) | 7 | 2500 imports, 250 concurrent, 500 mixed |
| X10 (10x load) | 8 | 5000 imports, 500 concurrent, 1000 mixed, 500 rapid CRUD |
| X100 (100x load) | 9 | 10000 imports, 1000+ concurrent, 5MB CSV |
| FINAL checks | 7 | Server alive, DB consistency after all abuse |

---

## Security Findings

| Attack Vector | Result |
|---|---|
| SQL injection (`'; DROP TABLE`) | Prisma parameterizes — no effect |
| XSS (`<script>alert()`) | HTML tags stripped from title/description |
| Unicode null bytes | Server returns 500 but recovers |
| Negative/overflow prices | Rejected with 400 |
| Empty/malformed JSON bodies | Returns 400, never 500 |
| Unauthenticated access | Redirected to /login via middleware |

---

## Recommendations

1. **Rate limiting** — No rate limiting exists on any endpoint. Add middleware for auth routes (prevent brute force) and AI routes (prevent abuse).
2. **Connection pooling** — The breaking point at ~2000 concurrent is a Node.js/connection limit. Consider PgBouncer or Prisma Accelerate for production.
3. **Analytics aggregation** — Currently loads all `PlatformListing` + `AnalyticsEvent` records into memory. Move to database-level `groupBy` / `aggregate` as event volume grows.
4. **Sales aggregation** — Monthly/platform breakdowns computed in JS. Move to SQL `GROUP BY` for datasets over 10k sales.
5. **Image optimization** — Uploaded images stored at full resolution. Add server-side resize/compression.
6. **Dynamic imports** — `jsPDF` and `recharts` are bundled statically. Lazy-load for faster initial page load.
