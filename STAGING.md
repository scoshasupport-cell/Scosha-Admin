# Scosha staging

Staging is a production-like copy with its **own** database, secrets, Cloudinary folder, and SMTP. It is not a second process pointed at production MySQL.

## Rules

- Never set staging `DATABASE_URL` to the production schema.
- Never copy production JWT or cookie secrets into staging.
- `CORS_ORIGINS` must list the real storefront and admin origins. Cookie-authenticated writes (login, refresh, guest cart) are rejected unless `Origin` or `Referer` is on that list. Bearer clients are unchanged. CORS alone is not the CSRF check.
- Prefer a separate Cloudinary folder (`scosha-staging`) or a separate cloud.
- SMTP should send only to staff / catch-all addresses. `EMAIL_ENABLED=0` is acceptable if you only need to prove that order creation still succeeds when mail is off (it does — order mail is `sendEmailAsync` after commit).
- Build like production: `NODE_ENV=production`, `npm run build`, `npm run build:admin`, `node src/server.js`.

## Bring-up

1. Create an empty MySQL schema (`scosha_staging`).
2. Copy `backend/.env.staging.example` → `backend/.env.staging` and fill it.
3. On a **new** empty schema: `npx prisma migrate deploy` from `backend/`.
4. On a schema cloned from production: restore the dump, then follow `DATABASE.md`. Resolve `20261008000000_init` only when `_prisma_migrations` is empty and the live diff is empty or is only the additive `tokenVersion` columns. Then `npx prisma migrate deploy` applies `20261009000000_token_version`.
5. Seed roles/admin: `npm run seed` (first time only).
6. Start API, then storefront `npm run start`, then smoke the list in `DEPLOYMENT.md`.

## Dataset

The shared development database currently has ~137 active products. That is too small to call a catalog-scale test. For listing/search thresholds, create a **separate** bench schema and set `BENCH_DATABASE_URL` (see `backend/test/catalog-scale.js`). Do not inflate the production or shared-dev catalog.

## Two API instances

Carts, wishlists, orders, and JWTs live in MySQL / signed tokens. Two Node processes behind a balancer work for checkout and auth.

Proven locally by `backend/test/two-instance.integration.test.js`: login JWT from process A is accepted by process B; a cart write on A is visible on B; last-unit checkout across A and B still yields one order and stock 0. Rate-limit counters do **not** share (429 on A does not 429 B).

What does **not** share:

- In-memory rate-limit counters (each instance has its own budget).
- The AI catalog index (`catalogIndex.service`) — rebuilt per process.
- Gemini model cooldown map — per process.

None of those affect money or stock. The MySQL user on this host (`GRANT ALL ON scosha.*` only) cannot `CREATE DATABASE scosha_bench`; a DBA must create that schema before `npm run load:scale`.
