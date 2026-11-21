# Scosha API contract

Base URL: `/api/v1`. Interactive docs: `/api/docs` (Swagger, generated from route annotations). This file documents the parts the clients depend on that Swagger does not express well: envelopes, error codes, auth and the checkout flow.

## Envelope

Success:

```json
{ "success": true, "message": "Order placed successfully", "data": { … }, "meta": { "page": 1, "limit": 12, "total": 137, "totalPages": 12, "hasNext": true, "hasPrev": false } }
```

Error:

```json
{ "success": false, "message": "Only 1 left in stock (SKU-123). Please reduce your quantity.", "code": "INSUFFICIENT_STOCK", "requestId": "4d2f…", "errors": { "available": 1, "requested": 3 } }
```

`code` is stable and machine-readable; `message` is for humans and may change. `requestId` matches the `X-Request-Id` response header and the server log line. Validation failures carry `errors: [{ field, message }]`. 5xx responses never include the underlying error text outside development.

## Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Body/query/params failed schema validation; see `errors[]` |
| `MALFORMED_JSON` | 400 | Request body is not valid JSON |
| `BAD_REQUEST` | 400 | Generic business rule failure without a specific code |
| `CART_EMPTY` | 400 | Checkout with no cart lines (also returned to the second of two concurrent submissions) |
| `ITEM_UNAVAILABLE` | 400 | A cart line's variant/product no longer exists or is inactive |
| `OUT_OF_STOCK` | 400 | Variant has 0 units left; `errors.available = 0` |
| `INSUFFICIENT_STOCK` | 400 | Variant has fewer units than requested; `errors.available` is the committed stock |
| `COUPON_INVALID` | 400 | Unknown, inactive or not-yet-active coupon |
| `COUPON_EXPIRED` | 400 | Coupon past `expiresAt` |
| `COUPON_LIMIT_REACHED` | 400 | Global or per-user usage limit reached (checked again atomically at commit) |
| `COUPON_MIN_ORDER` | 400 | Subtotal below the coupon minimum |
| `COUPON_NOT_APPLICABLE` | 400 | Coupon restricted to products/categories not in the cart |
| `INVALID_STATUS_TRANSITION` | 400 | Admin tried a disallowed order status move (see `ARCHITECTURE.md`) |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token, wrong token type, banned or deleted account |
| `INVALID_TOKEN` / `TOKEN_EXPIRED` | 401 | JWT-specific variants when the library reports them |
| `EMAIL_NOT_VERIFIED` | 403 | Email account has not completed OTP verification (phone-only accounts are exempt) |
| `FORBIDDEN` | 403 | Admin lacks the `module.action` permission |
| `NOT_FOUND` | 404 | Unknown route or resource |
| `ORDER_NOT_FOUND` | 404 | Order does not exist **or belongs to another customer** (deliberately indistinguishable) |
| `ADDRESS_NOT_FOUND` | 404 | Address does not exist or belongs to another customer |
| `CONFLICT` | 409 | Duplicate (e.g. email already registered) |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 10 MB |
| `RATE_LIMITED` | 429 | Limiter tripped; `RateLimit-*` headers describe the window |
| `UPLOAD_ERROR` | 400 | Multer rejected the file (type/size/count) |
| `INTERNAL_ERROR` | 500 | Unexpected failure; use `requestId` to find the log |

## Authentication

- Customers: `POST /auth/register` (email **or** phone + password), `POST /auth/verify-email` (OTP, email accounts), `POST /auth/login` (`{ email | phone, password }`), `POST /auth/google` (`{ accessToken }` from Google Identity Services; requires `GOOGLE_CLIENT_ID`), `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Tokens: short-lived access JWT (`type: "customer"`) + refresh JWT. Sent as `Authorization: Bearer` (preferred) or httpOnly cookies. The storefront keeps tokens in `localStorage`; see `PHASE2_REPORT.md` for the trade-off.
- Admins: `POST /admin/auth/login`; tokens carry `type: "admin"`. A customer token is rejected by every `/admin/*` route (401), and every admin route also checks a `module.action` permission (403). Super Admin bypasses permission checks.
- Mass assignment: register/profile schemas are strict zod objects; `role`, `roleId`, `isVip`, `isEmailVerified`, `status`, `freeDeliveryCredits` sent by a client are dropped (tested).

## Checkout

1. `GET /cart` — returns the cart with live `availableStock`/`maxQuantity` per line; quantities above stock are clamped server-side and reported in `stockMessages`.
2. `POST /orders/preview` `{ addressId, deliveryMethod, couponCode? }` — server-computed subtotal, shipping, tax, discount, total. Prices come from `ProductVariant.price`, never from the client.
3. `POST /orders` same body plus `notes?` — creates the order (COD). Response `data` is the order with item snapshots. Side effects (emails, admin notification) happen after commit and cannot fail the order.
4. `GET /orders`, `GET /orders/:id` — the customer's own orders only.

Customers cannot cancel; admins use `PATCH /admin/orders/:id/status` with the transition rules, `POST /admin/orders/:id/refund`, `PATCH /admin/orders/:id/tracking`.

## Pagination

`?page=&limit=` on list endpoints; `limit` is capped at 500 (`utils/pagination.js`). Responses carry `meta`. Admin exports (`/admin/reports/*`) are intentionally unpaginated; they are bounded by the requested date range (and one inventory export by a 5 000-row cap), not by `limit`.

## Headers

- `X-Request-Id` — echoed back (or generated) on every response.
- `X-Guest-Session-Id` — UUID the storefront sends for anonymous carts when third-party cookies are blocked; otherwise the signed `guestSessionId` cookie is used.
- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` — on rate-limited routes.
