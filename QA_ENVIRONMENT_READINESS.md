# QA environment readiness

Date: 9 October 2026. Read-only discovery plus a browser smoke test that did not sign in, place an order, or change catalog data. No deployment, migration, commit, or push.

**Write-enabled testing is blocked.** The backend is connected to the development schema `scosha` on local MySQL. That schema holds catalog and order data that must be kept. `TEST_DATABASE_URL` is not set. The application account cannot create another schema.

## Latest verified state

This section overrides older notes below. Sections titled as a first pass, retest, or earlier phase are historical.

| Item | Latest state |
| --- | --- |
| Storefront | Scosha on `http://localhost:3000` when the Next process is running |
| API | Local API on port 5000 when started |
| Admin | Local admin on port 5174 when started |
| Unit tests | Last executed run, Phase 3: **37 passing, 0 failing** |
| `scosha_test` | **Provisioned.** User `scosha_test@localhost` can connect only to `scosha_test`. Cannot read `scosha`. `TEST_DATABASE_URL` is set locally and not committed |
| Migrations on test DB | `npm run db:migrate:test` applied `20261008000000_init` and `20261009000000_token_version` to `scosha_test` only. Datasource printed as MySQL database `scosha_test` |
| Integration suite | **33 passing, 0 failing** against `scosha_test` only (`npm run test:integration`) |
| Concurrent checkout / stock locking | Verified by integration tests (double/triple submit, last-unit race, ten-customer race, rollback) |
| Authenticated browser E2E | Customer login, add to bag, COD checkout, and admin login completed against `scosha_test` (order `SCO-20261116-636690`; M stock 20→19) |
| Release | Not approved. Hosting/staging not chosen |

An earlier discovery pass found a different site on port 3000 and started this storefront on 3011. That site was later gone. The storefront process on 3011 was stopped, and Scosha has been the process on port 3000 since the evening retest. Do not treat the “port 3000 is occupied” sentences in the historical section as the current state.

## Retest — 9 October 2026, evening

The storefront dev server was moved from port 3011 to port 3000. Port 3000 was free. Next.js will not start a second dev server for the same project, so the 3011 process was stopped first.

| Check | Result |
| --- | --- |
| API `GET /api/v1/health` | 200. Database reported connected |
| Storefront `GET /api/v1/products?limit=48` through the Next proxy, three homepage sorts | 200 in 146–180 ms |
| Browser `http://localhost:3000/` | Homepage rendered. After the rails finished loading, “New Arrivals” was on the page and the “Loading collection” status was gone. No Next.js issues badge on that load |
| Hydration warning | Not reproduced on this load. Not claimed fixed |
| Admin `http://localhost:5174/admin/login` | Login form rendered. Sign-in was not submitted |
| `scosha_test` | Still absent. Only schema `scosha` (453 products, 4 orders). `TEST_DATABASE_URL` still unset |
| Login from origin `http://localhost:3011` | 401, not `CSRF_REJECTED`. That origin was added to the local allowlist. The storefront now uses `http://localhost:3000`, which was already allowlisted |

Integration tests still abort before Prisma opens when `TEST_DATABASE_URL` is missing or does not name `scosha_test`. A connected-database check also refuses writes unless `SELECT DATABASE()` is `scosha_test`. Those unit checks passed (6). No migration was applied and no order, stock, or login write was run.

## Milestone — 9 October 2026, later evening

The full backend unit suite was rerun after the CSRF middleware export fix: **37 tests, 37 passing, 0 failing**.

The API on port 5000 was restarted by touching the middleware file so the existing nodemon parent reloaded `src/server.js`. The listener moved from PID 6380 to PID 1040. No second server was started. `GET /api/v1/health` returned 200 after the restart.

Live CSRF probes used a nonexistent account and a fake password (no successful login, no credential printed):

| Origin | Result |
| --- | --- |
| `http://localhost:3000` | 401 `UNAUTHORIZED` |
| `http://127.0.0.1:3999` (not on the allowlist; plain HTTP loopback) | 401 `UNAUTHORIZED` |
| `http://evil.example` | 403 `CSRF_REJECTED` |
| `https://localhost:3000` | 403 `CSRF_REJECTED` |

The 401 on an unlisted HTTP loopback origin is the development exception. Production behavior was not checked by changing the live process. Unit tests keep `env.isProd` true and reject `http://127.0.0.1:3999` when it is absent from `corsOrigins`. `env.isProd` is `NODE_ENV === 'production'` in `backend/src/config/env.js`, read when the guard runs. `isDevLoopback` returns false whenever `env.isProd` is true.

| Check | Result |
| --- | --- |
| Root `npm run lint` | Exit 0. 0 errors, 36 warnings |
| Storefront browser | Homepage rails loaded (“New Arrivals”). Product `repeat-cardigan-red-r0021i06t-g11-sco-clo-0091` showed “Repeat Cardigan - red” and sizes XS–XXL, all disabled, with “Out of stock”. Add to bag was not used. Cart drawer opened to “Your bag is empty”. Shop filter “Clothes Winter” set `?category=clothes` and the heading became “Clothes · Winter collection” (156 product links). Mobile viewport 390px showed the menu button |
| Hydration | Reproduced on the product page. The Next.js overlay named `components/site/footer.tsx` (258:15) and the generic hydration hint. Not fixed in this pass |
| Admin login | Form still renders. Sign-in was not submitted |
| Admin production build | `tsc --noEmit && vite build` exit 0, built in 1m 42s. Storefront `next build` was not run while `next dev` holds `.next` |
| `scosha_test` | Still required before checkout, inventory, orders, or product CRUD |

## Status

| Gate | Status |
| --- | --- |
| Database target identified | READY |
| Isolated test database | READY (`scosha_test` provisioned and migrated) |
| Write-enabled tests (checkout, stock, orders, product CRUD, integration suite) | READY for automated suite; browser E2E still outstanding |
| Browser the agent can drive | READY for navigation and screenshots |
| Playwright / Cypress / traces | NOT READY |
| Dedicated customer and admin QA accounts | NOT READY |
| Email without real delivery | NOT READY |
| Cloudinary without a real upload | READY as a mock-only rule; real credentials are configured, so live uploads stay BLOCKED |
| Google sign-in | BLOCKED |
| WhatsApp as an API notification | Not an API. The site links to `wa.me`. Sending a real chat is BLOCKED |
| Hosting choice | Not selected. No deploy in this pass |

## Historical discovery — first pass

These bullets are the first inspection, before the storefront moved to port 3000 and before the test-database guard stopped falling through to `DATABASE_URL`. The latest verified state at the top replaces them where they disagree.

- Storefront dev command is `npm run dev` (Next.js, default port 3000). Admin is `npm run dev` in `admin` (Vite, port 5174, base path `/admin/`). API is `npm run dev` in `backend` (Express, default port 5000). `npm run dev:all` starts all three.
- Historical: at this moment port 3000 was taken by a different website, and Scosha’s storefront was started on port 3011. Superseded. The storefront now listens on port 3000.
- Historical: the API was not listening on port 5000 during that browser smoke, so homepage strips stayed on “Loading collection”. Superseded. The API later returned health 200, and the rails loaded.
- The admin login screen loaded at `http://localhost:5174/admin/login` (“SCOSHA Admin”, email, password, Sign in). Sign-in was not submitted.
- Resolved database target, without the connection URL: MySQL `8.0.38`, host `localhost`, port `3306`, schema `scosha`, account `scosha@localhost`. `NODE_ENV` is `development`.
- `TEST_DATABASE_URL` and `BENCH_DATABASE_URL` are unset. The only schema matching `scosha%` is `scosha`.
- Row counts in that schema: 5 users, 1 admin, 453 products, 5,218 variants, 4 orders. This is development data to preserve.
- Grants: `USAGE` on `*.*` and `ALL PRIVILEGES` on `scosha.*` only. This account cannot `CREATE DATABASE`. It can drop or rewrite objects inside `scosha`.
- Prisma reports 2 migrations and “Database schema is up to date” for `scosha`. Those migrations can be applied to a new empty schema with `prisma migrate deploy` once that schema exists. They were not applied anywhere else.
- Historical: this pass described integration tests as using `DATABASE_URL` when `TEST_DATABASE_URL` was unset. Superseded. `backend/test/helpers.js` now exits before Prisma opens unless `TEST_DATABASE_URL` names `scosha_test`, and `startApp()` checks `SELECT DATABASE()`.
- Playwright and Cypress are not dependencies. There is no Playwright or Cypress config. Firefox and WebKit were not launched.
- The Cursor browser opened the storefront, clicked Search, typed `coat` into the search box (the field showed that value), captured a screenshot, and opened the admin login page. A Next.js dev overlay reported 2 issues, including a hydration warning. That is an observed defect, not a finished diagnosis.
- Cookie code sets `HttpOnly`, path `/`, and no `Domain`. In production it also sets `Secure` and `SameSite=None`. In the current development process it uses `Secure` off and `SameSite=Lax`. That production combination was not exercised.
- Historical: a same-process check showed login from origin `http://localhost:3011` rejected with `CSRF_REJECTED` before that origin was allowlisted, and this note said port 3000 was occupied. Superseded for the port. Later probes accepted `http://localhost:3000` through to a 401 credential check.

## Unverified assumptions

- The 5 users and 1 admin are not confirmed as disposable QA accounts. Their addresses were not read.
- Historical: freeing port 3000 was still an open decision in this pass. Superseded. The storefront is on port 3000.
- Unit tests that never open MySQL were not re-run in this pass. They are expected to be safe; that is not a new test result.
- Staging hosting, TLS, and production cookie behavior are unknown because nothing was deployed.

## What is safe to run now

- Read-only inspection, lint, storefront and admin production builds.
- Backend unit tests that do not connect to MySQL (`npm run test:unit` in `backend` still loads some modules that read env; do not point them at a new database until the test schema exists).
- Browser walks that only open pages, type into fields, and do not submit login, registration, checkout, contact, newsletter, or upload forms.
- Mocked upload tests that never call Cloudinary.

## What stays blocked

Do not run `npm test` integration, `npm run seed`, checkout, inventory edits, product create/update/delete, admin CRUD, or browser flows that submit those forms. They write to `scosha`.

Do not send mail. SMTP host, user, and password are set, and email is enabled when those values are present. Order mail would use that transport.

Do not upload or delete Cloudinary assets. Cloud name, API key, and API secret are set.

Do not complete Google sign-in. `GOOGLE_CLIENT_ID` is unset, and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is absent from the storefront env file.

Do not open the WhatsApp link as a test. It is a `wa.me` URL in the storefront, not a server notification API.

## Database setup for a DBA

Do this with an account that is allowed to create schemas. Do not grant that power to `scosha@localhost`.

```sql
CREATE DATABASE scosha_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'scosha_test'@'localhost' IDENTIFIED BY '<choose-a-password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES
  ON `scosha_test`.* TO 'scosha_test'@'localhost';
FLUSH PRIVILEGES;
```

Then, only in the local backend environment, set `TEST_DATABASE_URL` to a MySQL URL for database `scosha_test` and user `scosha_test`. Do not commit it. The first draft of this section said to run `npx prisma migrate deploy` from `backend`. That command uses `DATABASE_URL` and must not be used for the test schema. The command that refuses any database other than `scosha_test` is:

```text
cd backend
npm run db:migrate:test
```

Create QA users inside `scosha_test`, not in `scosha`: one customer, one full admin, and one admin whose role does not include every module. Keep the passwords in the local env or a password manager. The seed script in the repo contains a built-in admin; do not use that single development admin for destructive tests.

Copy a few products with known price, stock, size, and color into `scosha_test` after migrations. Do not run the image-migration script against the real Cloudinary account.

## Browser setup

The agent can already drive the Cursor browser (click, type, navigate, screenshot) against the running storefront and admin login page. That is not Playwright. It does not record Playwright traces, and it did not launch Firefox or WebKit.

If you want a committed browser suite later, the smallest addition is the `@playwright/test` dev dependency and a Chromium install. That changes the lockfile. It was not installed. Do not treat a generated spec file as a completed browser test.

## Integrations

| Integration | Configured | Safe test path |
| --- | --- | --- |
| MySQL | Yes, schema `scosha` | Blocked for writes until `scosha_test` exists |
| SMTP | Yes, and sending is enabled | Keep `EMAIL_ENABLED=0` for QA, or use Nodemailer’s `jsonTransport`. Do not use the live SMTP account |
| Cloudinary | Yes | Mock `upload_stream` and `destroy`. No live upload in this phase |
| Google sign-in | Client id missing | Other auth flows only, after the test database exists |
| WhatsApp | Public `wa.me` link only | Do not open it during tests |
| Auth secrets, cookie secret, CORS, storefront URL, admin URL | Set on the API | Values not printed |
| Storefront API URL | Set in `.env.local` | Relative `/api/v1` is the intended browser path; the proxy target is set separately |
| Admin API URL | `VITE_API_URL` is set | Points at the local API by default in the example file |

Development cookies are not the production cookie policy. A production-mode check belongs on staging, after hosting is chosen.

## How to start the apps

```text
npm run dev --prefix backend
npm run dev --prefix admin
npx next dev -p 3000
```

Historical: an early pass used port 3011 because another site held 3000. That is no longer the start command. The current storefront is already on port 3000. Do not start a second Next dev server for this project.

## Hosting, after QA

Not chosen and not provisioned. Local QA passing still would not prove TLS, the production `Secure` / `SameSite=None` cookies, CORS for the real domains, or Cloudinary and SMTP on a server.

The three processes can share one machine or be split:

- Storefront: `npm run build` then `npm run start` (Next.js).
- Admin: `npm run build` in `admin` (Vite static files). The repo also has `build:admin`, which copies a build under the storefront.
- API: `npm start` in `backend` (Node). It needs a reachable MySQL schema, the env names in `backend/.env.example`, and Cloudinary if uploads are enabled.

Staging checklist before any production cutover: empty staging schema, `prisma migrate deploy`, restore drill from a backup of `scosha`, smoke login on the real staging origins, confirm cookies and CORS, send mail only to a test inbox, upload only into a test Cloudinary folder, and keep a rollback that is the previous build plus the previous migration state. No DNS or paid resources were changed here.

## Phase 2 — 9 October 2026

### Hydration

The product-page overlay in the Cursor browser is an attribute mismatch, not a text mismatch. The diff lists `data-cursor-ref` on footer links, including the home link at `components/site/footer.tsx`. The storefront source does not set that attribute. It is injected by the Cursor browser so the automation tool can address elements.

A separate Google Chrome headless session (Chrome DevTools Protocol, not Playwright) loaded the homepage and the red-cardigan product page. Neither load reported a hydration message. The product page’s only failed responses were guest `GET /api/v1/auth/me` and `POST /api/v1/auth/refresh`, both 401 `UNAUTHORIZED`, which is the expected result with no session.

`new Date().getFullYear()` in the footer rendered `© 2026` and was not the differing attribute. `suppressHydrationWarning` was not added. No footer code change was made, because removing the application markup would not stop the injected attribute.

While `next build` was running, one Chrome pass recorded HTTP 500 from the storefront proxy for products, `/auth/me`, and `/cart`. After the build finished, `curl` against the proxy returned 200 for health and products, and a later Chrome homepage load recorded no failed responses.

### Inventory

`GET /api/v1/products/repeat-cardigan-red-r0021i06t-g11-sco-clo-0091` returned six variants, XS through XXL, each with `stock: 0`. The storefront sets `inStock` from `stock > 0` in `lib/shop-api.ts`, and the product page disables a size when its matching variant is not in stock. The disabled sizes match the current data. The development database was not changed. Catalog `specs` on that product still say sheet quantity 1 and available size `m`; the page does not use that field for the size buttons.

### Build, browser, lint

| Command | Result |
| --- | --- |
| `npm run build` at the storefront root, while `next dev` kept `.next/dev` | Exit 0. Next.js 16.3.8 compiled, typecheck passed, and the route list was printed. The dev server stayed up |
| `npm run test:unit` | Not rerun. No application code changed after the 37/0 result |
| Root lint | Not rerun. Prior result remains exit 0, 0 errors, 36 warnings |

Browser tools: Cursor’s Chromium tab for clicks (search results for “cardigan”: heading and 20 product links; tablet width 768 still shows the menu button; cart drawer still empty). Google Chrome headless for console and failed-request capture. Playwright is not installed.

Lint warnings are style and React Compiler notes, not security findings. They were left in place:

- `react-hooks/set-state-in-effect` — mount and effect state updates, including `hooks/useHasMounted.ts`
- `react-hooks/exhaustive-deps` — admin `useMemo` column lists omit stable handlers such as `openEdit`
- `react-hooks/incompatible-library` — TanStack Table in the admin data table
- `react-hooks/immutability`, `react-hooks/preserve-manual-memoization` — compiler notes
- `@next/next/no-img-element` — admin and one storefront `<img>`
- `@next/next/no-location-assign-relative-destination` — admin Vite code using `window.location`; not a Next.js navigation bug
- `import/no-anonymous-default-export` — admin PostCSS and Tailwind config

### Admin authentication

Reviewed, not executed with a real account. Customer requests use the `accessToken` cookie and require JWT `type: customer` plus an active user. Admin requests use `adminAccessToken` and require `type: admin`. A customer token does not satisfy the admin middleware, and the reverse is also rejected. No QA accounts were created in `scosha`. Successful login, logout, expiry, and role checks remain blocked until `scosha_test` and dedicated credentials exist.

### Database gate

`backend/src/config/testDatabase.js` still refuses a missing `TEST_DATABASE_URL` or any database name other than `scosha_test`. `backend/test/helpers.js` applies that check before Prisma opens, then checks `SELECT DATABASE()` before the test server listens. Nothing was migrated.

DBA steps, unchanged: create schema `scosha_test` (`utf8mb4` / `utf8mb4_unicode_ci`), create `scosha_test@localhost`, grant only `SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES` on `scosha_test.*`, then set `TEST_DATABASE_URL` locally and run `npm run db:migrate:test` from `backend`. Do not grant that user access to `scosha`.

This phase is local QA evidence. It is not production release approval.

## Phase 3 — 9 October 2026

No footer, inventory, or stock code was changed. No write-enabled integration test was executed. `TEST_DATABASE_URL` is still unset.

### Commands

| Command | Result |
| --- | --- |
| `npm run test:unit` in `backend` | Exit 0. 37 tests, 37 pass, 0 fail |
| `node -e "require('./test/helpers')"` in `backend` | Exit 1. Message: `TEST_DATABASE_URL is not set. Refusing to run because the development database must not be written.` Prisma was not opened |
| `GET /api/v1/health` | 200. One listener on port 5000 (node PID 15552) |
| Storefront port 3000, admin port 5174 | One listener each (PIDs 3324 and 14856). No extra server was started |
| `npm run test:integration`, checkout, load, catalog bench | Not run |

### Security review (read-only)

Checkout accepts `addressId`, `deliveryMethod`, `couponCode`, and `notes`. The client cannot send a price. Line prices come from the variant row, and totals go through integer cents in `backend/src/utils/money.js`. Those money unit tests passed again in the run above.

`createOrder` locks the cart with `SELECT … FOR UPDATE`, claims stock with a second `FOR UPDATE` plus `updateMany` where `stock >= quantity`, and writes the order in the same transaction. A failed claim throws before the stock decrement. Email is sent only after commit. The integration harness sets `EMAIL_ENABLED=0`. Live SMTP is still configured on the development API, so order tests must not run there.

Customer and admin tokens stay separated by cookie name and JWT `type`. Admin routes add `requirePermission`. Zod `validate` replaces the request body with the parsed object. The error handler maps Zod failures to `VALIDATION_ERROR`, hides non-`ApiError` 500 messages, and returns JWT expiry as 401. Rate limits are in-memory per process: general, auth, OTP (keyed by email), VIP check, and AI scan. A second API instance would not share those counters. That is already covered by `two-instance.integration.test.js`, which is unrun.

CSRF behavior was not retested. The previous unit tests and live origin probes still stand.

### Integration suite, prepared and not run

Every `*.integration.test.js` file except the health fixture loads `backend/test/helpers.js` first. That file overwrites `DATABASE_URL` with `assertIsolatedTestDatabase()` or exits before `prisma.js` is required. `startApp()` then requires `SELECT DATABASE()` to be `scosha_test` before `listen`. Cleanup deletes only rows it created. Deleting a test role cascades its `RolePermission` rows. Shared `Permission` rows created by upsert can remain in the test schema; they are not written to `scosha` because the harness never gets that far today.

Already written, and waiting on the test schema:

- Checkout: one order for concurrent double and triple submits, last-unit races, coupon cents, stock left unchanged on validation failure, price snapshot after a later variant price change.
- Security: IDOR, wrong-type and banned tokens, permission-less admin, illegal order transitions, mass assignment of `role` / `isVip` / `isEmailVerified`.
- Session: logout, password change, refresh rotation, admin ban.
- CSRF: cookie Origin checks versus bearer clients.

Fixtures are created inside those tests (`createCustomer`, `createCatalog`, `createAdmin`) with `@example.test` addresses. They are not seeded into `scosha`.

`test/health.integration.test.js` does not use the harness. It forks an app whose `DATABASE_URL` is `127.0.0.1:1` and changes directory before load so the backend `.env` is not read. It was not run in this pass. `test/load.js` uses the harness, so it also refuses to start without `scosha_test`. `test/catalog-scale.js` is separate: it requires `BENCH_DATABASE_URL` and refuses a URL whose path is exactly `scosha`. Do not point it at the development schema.

### Lint

The 36 warnings were reviewed again and left unchanged. None are a security or correctness defect that this pass should edit.

### Still blocked

`scosha_test` and `scosha_test@localhost` do not exist. After a DBA creates them, set `TEST_DATABASE_URL` only in local `backend/.env`, run `npm run db:migrate:test` from `backend`, confirm `SELECT DATABASE()` is `scosha_test`, then create QA customer, full-admin, and restricted-admin users in that schema only. Integration tests and authenticated browser login stay unrun until then.

This is not production release approval.

## Phase 4 — 9 October 2026

Stopped at the database-readiness gate. Integration tests, migrations, QA account creation, and authenticated browser checkout were not run. No application code was changed.

`information_schema.SCHEMATA`, read with the existing application account, lists `information_schema`, `performance_schema`, and `scosha`. `scosha_test` is not among them. `TEST_DATABASE_URL` is unset. The development schema name parsed from `DATABASE_URL` is `scosha`. Connection strings were not printed.

`npm run db:migrate:test` is `node src/scripts/migrate-test-database.js`. That script calls `assertIsolatedTestDatabase()` before spawning Prisma. The check accepts only a `TEST_DATABASE_URL` whose path is exactly `scosha_test`. On success it runs `prisma migrate deploy` with `DATABASE_URL` overwritten to that test URL for the child process. It does not read the development URL as a fallback.

| Command | Result |
| --- | --- |
| `node src/scripts/migrate-test-database.js` | Exit 1, before `prisma migrate deploy`. Message: `TEST_DATABASE_URL is not set. Refusing to run because the development database must not be written.` |
| `npm run test:integration` | Not run |
| Browser checkout and admin login | Not run |

DBA action still required, as a privileged account, not as the application user:

```sql
CREATE DATABASE scosha_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'scosha_test'@'localhost' IDENTIFIED BY '<strong unique password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON scosha_test.* TO 'scosha_test'@'localhost';
FLUSH PRIVILEGES;
```

Do not grant that user any privilege on `scosha`. After that, set `TEST_DATABASE_URL` only in local `backend/.env` (do not commit it), rerun `npm run db:migrate:test` from `backend`, and confirm `SELECT DATABASE()` is `scosha_test` before any write test.

Unit-test and code-review results from earlier phases are unchanged. They do not prove checkout or stock behavior under integration or concurrent use. This is not production release approval.

## Phase 5 — 9 October 2026

Historical port-report cleanup. At that time `scosha_test` was still absent. Superseded by Phase 6.

## Phase 6 — 16 November 2026

`scosha_test` and `scosha_test@localhost` were created in MySQL Workbench. Local `TEST_DATABASE_URL` was set in `backend/.env` (not committed). Isolation check: connected database `scosha_test`, user `scosha_test@localhost`, cannot read the development schema.

`npm run db:migrate:test` applied both migrations to `scosha_test` only (Prisma printed datasource database `scosha_test`). The migrate script and integration harness were updated to load `.env` before the isolation guard, because `node` does not load dotenv automatically.

| Command | Result |
| --- | --- |
| `npm run db:migrate:test` | Exit 0. Migrations `20261008000000_init` and `20261009000000_token_version` applied |
| `npm run test:integration` | Exit 0. **33 tests, 33 pass, 0 fail**. Includes concurrent checkout, last-unit stock races, rollback, CSRF, IDOR, admin boundaries, session invalidation |

The development schema `scosha` was not migrated and was not used by the integration harness. Authenticated browser checkout against a running UI is still outstanding. Deployment is still not approved.

## Decision needed from you

1. Historical: create `scosha_test`. Done.
2. Historical: choosing port 3000 versus another CORS origin. Superseded.
3. Run authenticated browser smoke with dedicated QA accounts in `scosha_test` (or fixtures created by tests).
4. Choose hosting/staging before production deploy.
5. Do not approve production deployment from this report alone.
