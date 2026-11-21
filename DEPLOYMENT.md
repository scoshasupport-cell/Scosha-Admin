# Scosha deployment

Three deployables, one database:

| Part | Tech | Runs as | Needs |
| --- | --- | --- | --- |
| Storefront | Next.js 16 (`/`) | Node server or Vercel | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (optional) |
| API | Express + Prisma (`/backend`) | Node 22 process | MySQL 8, `.env` (see below) |
| Admin | Vite SPA (`/admin`) | Static files served by the storefront at `/admin` | `VITE_API_URL` at build time |

The API is the only process that talks to MySQL. The storefront and admin are clients of `/api/v1`.

## 1. Environment variables

Copy `backend/.env.example` to `backend/.env` and fill it. Never commit `.env`; all three `.gitignore` files already exclude it and only `.env.example` files are tracked.

Required for the API to start (validated by `backend/src/config/env.js`; the process exits with the list of invalid keys, values are never printed):

- `DATABASE_URL` — `mysql://user:pass@host:3306/scosha`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — at least 16 characters each; use 32+ random bytes in production
- `COOKIE_SECRET` — signs the guest-cart cookie
- `NODE_ENV=production` — turns on secure cookies, `SameSite=None`, strict CORS, JSON logs

Operational:

- `CORS_ORIGINS` — comma separated list of the exact storefront and admin origins. In production an origin not on this list is rejected.
- `STOREFRONT_URL`, `ADMIN_URL` — used in emails and links
- `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_MAX`, `OTP_RATE_LIMIT_MAX` — see "Rate limiting" below
- `LOG_LEVEL` — `info` in production
- `TAX_RATE`, `FREE_SHIPPING_THRESHOLD`, `DEFAULT_SHIPPING_CHARGE` — defaults; the admin Settings record overrides them

Optional integrations (each is skipped cleanly when empty): `SMTP_*`/`EMAIL_ENABLED`, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`, `PERFECT_CORP_*`.

## 2. Database

See `DATABASE.md`. Production uses `npx prisma migrate deploy`. An existing database created with `db push` is adopted only after a verified backup restore and a live schema diff. Resolve `20261008000000_init` only when `_prisma_migrations` is empty. `migrate deploy` then applies `20261009000000_token_version` if that row is missing. "No pending migrations" is expected after deploy, not immediately after the baseline resolve. Never run `db push --accept-data-loss` in production.

## 3. Build and run

```bash
# API
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy   # empty schema: applies baseline. Existing DBs: resolve --applied first (DATABASE.md)
npm run seed                # first deploy only: roles, permissions, first admin
NODE_ENV=production node src/server.js

# Admin (built into the storefront's public/ folder)
cd ..
npm run build:admin

# Storefront
npm ci
npm run build
npm run start               # or deploy to Vercel
```

Run the API under a supervisor (systemd, pm2, Docker restart policy). The process handles `SIGTERM`/`SIGINT`: it stops accepting connections, waits for in-flight requests, disconnects Prisma, and force-exits after 10 seconds.

## 4. Reverse proxy

Put the API behind nginx/Caddy/a cloud load balancer that terminates TLS. The API sets `trust proxy = 1`, so it trusts exactly one proxy hop for the client IP (`X-Forwarded-For`). If there are two proxies in front, raise that number in `backend/src/app.js` or rate limiting will key on the wrong IP.

Health checks:

- Liveness: `GET /api/v1/health/live` — 200 while the process is up
- Readiness: `GET /api/v1/health/ready` — 200 when `SELECT 1` succeeds, 503 otherwise. Point the load balancer here. Verified by `backend/test/health.integration.test.js` with MySQL genuinely unreachable.

## 5. Rate limiting

All limiters are in-memory (`express-rate-limit` default store):

- Counters belong to one process. Two API instances means twice the limit per client unless the balancer uses sticky sessions.
- Counters reset on restart.
- `authLimiter` (default 20 / 15 min per IP) also guards `POST /orders` and `POST /orders/preview`. Customers behind one corporate NAT share that budget; raise `AUTH_RATE_LIMIT_MAX` if checkout 429s appear in the logs.

A shared store (Redis) becomes necessary only when a second API instance is deployed. Until then it is extra infrastructure with no benefit.

## 6. Logs

One structured line per request (`request`) with `requestId`, `method`, `path`, `status`, `durationMs`, `ip`, and `userId`/`adminId` when authenticated. 5xx errors log the stack with the same `requestId`, and the client receives that id in the body and in the `X-Request-Id` header, so a customer screenshot can be matched to the server log. An incoming `X-Request-Id` is honoured when it is ≤ 80 chars of `[A-Za-z0-9._:-]`; otherwise a UUID is issued.

Nothing in the codebase logs environment values; `env.js` prints only the names of invalid keys.

## 7. Scaling model (what is proven, what is theory)

Proven on this machine with the integration suite (`npm test` in `backend/`):

- Two concurrent checkouts from the same cart create one order.
- Two customers buying the last unit: one order, stock ends at 0, the loser gets `OUT_OF_STOCK` (400), not a 500.
- Ten customers racing for 3 units: exactly 3 orders.
- A failure after stock is claimed rolls back order, stock movement and cart.

Theory (not load-tested):

- One API process on a 2-vCPU box should handle the current catalog (≈140 products, ≈5 200 variants) at the measured p50 latencies (see `PHASE2_REPORT.md`, "Performance") for a few hundred concurrent shoppers. The checkout path is serialized per cart and per variant by row locks, so throughput on one hot SKU is bounded by MySQL commit latency (~5–20 ms locally), i.e. tens of orders per second per SKU — far beyond expected demand.
- Horizontal scaling: run N API processes behind the balancer. Nothing lives in process memory except rate-limit counters (see §5). Carts, sessions (JWT), wishlists and orders are in MySQL.
- Database: single MySQL 8 primary. Read replicas are not needed until listing/search queries saturate it; search currently scans the `products` table with `LIKE '%q%'` (see `DATABASE.md`).

## 8. Staging / network load-test plan

Use `autocannon` or `k6` against a staging copy of the database, never production:

1. Warm: `GET /api/v1/products?limit=12` at 50 concurrent connections for 60 s. Record p95 and error rate.
2. Browse: mix `GET /products/:slug`, `GET /search?q=dress`, `GET /cart` (guest) at 100 connections for 120 s.
3. Checkout: 20 verified test customers each with one cart line on a variant with stock 1000; `POST /orders` in a loop with fresh carts per iteration. Expect 0 oversell (stock after = 1000 − successful orders) and no 5xx.
4. Hot SKU: 50 customers, one variant with stock 10; expect exactly 10 orders and 40 `OUT_OF_STOCK`.

Pass criteria: p95 < 300 ms for browse endpoints at the chosen concurrency, 0 oversell, 0 unexpected 5xx. `backend/test/bench.js` is the sequential baseline; `npm run load` in `backend/` is a 20-worker in-process smoke (already run locally — see `PHASE2_REPORT.md`).

## 9. Production deploy sequence

```text
mysqldump --single-transaction scosha > backup-YYYYMMDD.sql
↓
Build storefront + admin + confirm backend npm test on staging
↓
If this database was created with db push and has no _prisma_migrations:
    live diff (DATABASE.md) is empty, or only ADD COLUMN tokenVersion
    prisma migrate resolve --applied 20261008000000_init
↓
npx prisma migrate deploy   # applies 20261009000000_token_version when not yet recorded
↓
Restart API (SIGTERM → 10s drain)
↓
GET /api/v1/health/ready → 200
↓
Smoke list below
```

Rollback: restore the dump. The baseline migration has no down file. A later additive migration (nullable column / index) can be reversed with a new forward migration, not by deleting history.

## 10. Smoke list (after deploy, migrate, restart, and — when used — a second API instance)

Storefront: homepage, `/shop`, search, product detail + variant, bag add, login, register, checkout, order confirmation.

Admin: login, create product, inventory adjust, order status change, image upload.

API: `/health/live`, `/health/ready`. Confirm one order email was queued (or skipped for `@example.test`) and that a failed upload did not create a broken product.

## 11. Deploy checklist

- [ ] `NODE_ENV=production`, fresh JWT and cookie secrets
- [ ] `CORS_ORIGINS` lists only the real origins
- [ ] Database backup taken and a restore has been practiced on staging
- [ ] `prisma migrate deploy` (not `db push`)
- [ ] `npm test` in `backend/` passed against a staging database
- [ ] `npm run build` (storefront) and `npm run build:admin` succeeded
- [ ] Load balancer health check points at `/api/v1/health/ready`
- [ ] Log shipping configured (stdout JSON)
- [ ] `npm audit --omit=dev` reviewed in all three packages
- [ ] Staging used its own database (see `STAGING.md`)
