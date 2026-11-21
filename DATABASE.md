# Scosha database

MySQL 8, one schema (`scosha`), accessed only by the API through Prisma 5 (`backend/prisma/schema.prisma`).

## Schema management

Production schema deploys use **`prisma migrate deploy`**, not `db push`.

The baseline is `backend/prisma/migrations/20261008000000_init/migration.sql`. It is a CREATE-TABLE dump of the current schema. It is **irreversible** in the sense that rolling it back means dropping the database and restoring a backup — there is no down migration.

### Existing populated databases (adoption)

Do **not** run `migrate deploy` until this baseline is marked applied. The SQL is `CREATE TABLE` and will fail on tables that already exist. Do **not** mark it applied just because tables exist.

The local `scosha` MySQL user is granted `ALL PRIVILEGES ON scosha.*` only. That is enough to run this schema and `migrate resolve` / `migrate deploy`. It is **not** enough to `CREATE DATABASE`. A bench or staging schema needs a privileged account (or a DBA-created empty schema) and its own URL.

Adoption, in order. Stop if any step fails. Do not continue to `migrate resolve`.

```bash
cd backend

# 1. Backup, then prove the dump is restorable on an empty schema.
#    Commands and checks: PHASE4_REPORT.md § Backup and recovery.
#    A dump file that has never been restored does not satisfy this step.

# 2. Compare the connected database to the Prisma models.
#    Prisma 5.22: --from-schema-datasource reads DATABASE_URL (the live schema).
#    --to-schema-datamodel reads the models in the same file.
#    These are not two copies of the file. An empty script means the live database
#    matches the models. It does not mean the file was compared to itself.
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script --exit-code
#    Exit 0 and "-- This is an empty migration.": live schema matches the models.
#    Exit 2: the script is the drift. Read it.
#      - Only `ADD COLUMN tokenVersion` on users/admins: expected on a database that
#        predates 20261009000000_token_version. Do not mark that migration applied by hand.
#      - DROP, TRUNCATE, or column type changes: stop. Do not resolve or deploy.

# 3. Only after (1) succeeded, and only when _prisma_migrations is empty
#    AND the drift is empty or is only the additive tokenVersion columns:
npx prisma migrate resolve --applied 20261008000000_init
npx prisma migrate deploy
#    deploy applies 20261009000000_token_version when it is not recorded yet.
#    "No pending migrations" is the result only after that migration is recorded.
npx prisma migrate status
```

If `migrate deploy` fails after resolve, do not start the new API build. Inspect `_prisma_migrations` for a failed row, restore the backup from step 1 into a replacement schema, and point the app at that schema. There is no down migration.

This development database already has `20261008000000_init` recorded. That recording predates the restore drill above. Treat it as history adoption on a dev schema, not as evidence that backup restore was practiced. Staging and production copies still follow steps 1–3.

`20261009000000_token_version` adds `tokenVersion` to `users` and `admins` (integer, default 0). It is additive. Take a backup before `migrate deploy` on any database that is not this development schema. Do not hand-edit the columns.

`npm run db:push` remains for emergency local prototyping only. It is not the production path.

### New empty databases (staging/prod first deploy)

```bash
npx prisma migrate deploy
npm run seed
```

### Connection pool

Prisma's pool size is `connection_limit` on `DATABASE_URL` (default ≈ `num_cpus * 2 + 1`).

```text
API instances × connection_limit  ≤  MySQL max_connections − 20
```

Example: `max_connections = 151`, two API processes, `connection_limit=10` → 20 connections used, headroom left for admin/backups. Do not pick a number without reading `max_connections` on that host.

`pool_timeout` (seconds) is how long a request waits for a free connection before Prisma throws. `10` is a reasonable start.

### Backups (hosting, not the app)

The application does not take backups. The operator must:

- Enable automated MySQL backups (daily at minimum; PITR if the host offers it).
- Keep retention longer than your worst expected detection time.
- Restore a backup onto a staging schema at least once before go-live.
- Take a dump immediately before every `migrate deploy`.

Having a backup job is not enough. A restore that has never been tested is theoretical.

## Money

All money columns are `DECIMAL(10,2)`. The API computes in integer cents (`backend/src/utils/money.js`) and only writes rounded values, so `0.1 + 0.2` style drift cannot reach the database. Prices on `OrderItem` are snapshots taken at checkout; changing `ProductVariant.price` later does not alter past orders (verified by `test/checkout.integration.test.js`).

## Concurrency and locking

Checkout (`order.service.createOrder`) runs in one `prisma.$transaction` (REPEATABLE READ, 20 s timeout):

1. `SELECT id FROM carts WHERE userId = ? FOR UPDATE` — serializes a customer's concurrent checkouts; the second one finds the cart empty and returns `CART_EMPTY`.
2. `cartItem.deleteMany` claims the cart.
3. Order row is inserted (no items yet).
4. For each line, **in ascending variant id order**: `SELECT stock FROM product_variants WHERE id = ? FOR UPDATE`, then a conditional `UPDATE … SET stock = stock − qty WHERE stock ≥ qty`. The locking read is what makes the losing customer see the committed stock instead of their snapshot, and consistent ordering prevents lock cycles between multi-line carts.
5. Order items are inserted after the stock claim. This order matters: `order_items.variantId` is a foreign key, and InnoDB takes a shared lock on the parent variant row for the FK check. Inserting items first and claiming stock second produced a real deadlock (`P2034`) between two customers in the first test run.
6. If InnoDB still aborts the transaction with a write conflict, the whole transaction is retried up to 3 times; it re-reads cart and stock each time, so a retry cannot double-claim.

Admin status changes and refunds lock the order row (`SELECT … FOR UPDATE`) before reading its status, so two admins cancelling at once restore stock exactly once (verified).

Emails and the admin notification are sent after commit and are best-effort.

## Indexes mapped to real queries

`EXPLAIN FORMAT=TREE` output from the real database (`npm run bench` in `backend/`), 137 active products / 5 218 variants / 3 orders at the time of the run:

| Query (where it runs) | Plan | Index |
| --- | --- | --- |
| Storefront listing, newest first (`GET /products`) | reverse index scan, LIMIT 12 | `products_createdAt_idx` |
| Category listing (`GET /products?category=`) | index lookup + sort of the matched rows | `products_categoryId_status_idx` |
| Price sort (`?sort=price_asc`) | covering index lookup | `products_status_basePrice_idx` |
| Product by slug (`GET /products/:slug`) | const lookup | `products_slug_key` |
| Variants of a product | index lookup | `product_variants_productId_colorName_size_idx` |
| Customer order history (`GET /orders`) | covering index, reverse | `orders_userId_createdAt_idx` |
| Admin orders by status | covering index, reverse | `orders_status_createdAt_idx` |
| Cart by user | const (unique) | `carts_userId_key` |
| Revenue chart (`GROUP BY DATE(createdAt)`) | index range on `createdAt`, aggregate in MySQL | `orders_createdAt_idx` |
| Top products (`JOIN order_items`) | index on orders.status → `order_items_orderId_idx` | both |
| Low stock (admin) | scan of `(status, stock)` index, 5 202 rows | `product_variants_status_stock_idx` |
| **Search** (`GET /search?q=`) | **full index scan with `LIKE '%q%'` filter on name/description/slug** | none usable |

No new index was added in this phase: every production query already has a matching index, and the two scans (search, low-stock) are explained below.

## Search: `contains` threshold

`search.service.js` and `product.service.js` use Prisma `contains` on `name`, `description` (TEXT) and `slug`. MySQL cannot use a B-tree index for a leading wildcard, so the query reads every active product row and tests the pattern. Measured today: p50 42 ms / p95 127 ms for `q=dress` at 137 products.

Keep it as-is until the catalog passes roughly **5 000 products** or search p95 passes **300 ms** in the request log. At that point the right tool is a MySQL `FULLTEXT` index on `(name, description)` with `MATCH … AGAINST`, which Prisma exposes via `@@fulltext` (preview feature) or a raw query. Elasticsearch or another search service is not justified at any size this store is planned for.

## Deletion and integrity

- `Order.userId → User` has no `ON DELETE` rule: an order can never be orphaned or cascaded away by deleting a user. Admin "Delete customer" therefore **anonymizes** an account that has orders (name, email, phone, Google id, password hash, tokens wiped; `status = deleted`; cart, wishlist, addresses, activity removed) and hard-deletes only accounts with zero orders. Revenue and stock-movement history stay intact.
- `OrderItem.productId / variantId` are `ON DELETE SET NULL`: deleting a product keeps the order line with its snapshot (name, SKU, price).
- `CartItem`, `WishlistItem`, `StockMovement` cascade from their parent; they carry no financial meaning.
- `Order.status` transitions are enforced in `constants/commerce.js`; terminal states (`cancelled`, `refunded`) cannot be left.

## Test database

The integration suite (`npm run test:integration`) runs against `DATABASE_URL`, or `TEST_DATABASE_URL` when set. Every fixture is tagged with a run id and deleted in `after()`; the suite has been run against the development database with zero residue (checked by counting tagged users, products, brands, roles, admins and orphan notifications afterwards). Use a dedicated database in CI anyway.
