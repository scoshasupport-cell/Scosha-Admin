# SCOSHA E-commerce API Documentation

**Version:** 1.0  
**Audience:** Client / integration partners  
**Base path:** `/api/v1`  
**Interactive Swagger UI:** `{HOST}/api/docs`  
**OpenAPI JSON:** `{HOST}/api/docs.json`

| Environment | Base URL (example) |
|-------------|-------------------|
| Local | `http://localhost:5000/api/v1` |
| Production | `https://{YOUR-API-DOMAIN}/api/v1` |

> **SCOSHA is a fully independent stack** (own MySQL database, Cloudinary cloud, SMTP, JWT secrets, and deployment). It is **not** linked to Amaz.

---

## 1. Overview

REST JSON API powering:

- Customer storefront (catalog, cart, COD checkout, wishlist, account)
- Admin panel (catalog, orders, content, VIP, reports, RBAC)
- Optional AI shopping assistant & virtual try-on

**Payment model:** Cash on Delivery (COD) by default.

---

## 2. Conventions

### 2.1 Success response

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 100,
    "totalPages": 9,
    "hasNext": true,
    "hasPrev": false
  }
}
```

`meta` is present on paginated list endpoints.

### 2.2 Error response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

| HTTP status | Typical meaning |
|-------------|-----------------|
| 400 | Validation / bad request |
| 401 | Missing or invalid auth |
| 403 | Forbidden (permission / email not verified) |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Server error |

### 2.3 Content type

- Request bodies: `Content-Type: application/json` (unless multipart upload)
- Accept: `application/json`

---

## 3. Authentication

### 3.1 Customer (storefront)

| Method | How |
|--------|-----|
| Preferred | `Authorization: Bearer <accessToken>` |
| Alternative | HttpOnly cookies `accessToken` + `refreshToken` |

**Login / verify** returns tokens in `data` and may set cookies.

### 3.2 Admin panel

| Method | How |
|--------|-----|
| Preferred | `Authorization: Bearer <adminAccessToken>` |
| Alternative | Cookies `adminAccessToken` + `adminRefreshToken` |

Admin routes also enforce **RBAC permissions** (module + action). Super-admin bypasses permission checks.

### 3.3 Guest cart (anonymous shoppers)

| Mechanism | Name |
|-----------|------|
| Signed cookie | `guestSessionId` (auto-created for anonymous requests) |
| Header fallback | `X-Guest-Session-Id: <uuid>` (use when cookies are blocked) |

After login, call `POST /cart/merge` to merge the guest cart into the customer cart.

---

## 4. Customer Auth — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register (email **or** phone + password). Sends OTP when email used. |
| POST | `/auth/verify-email` | Public | Verify OTP → JWT |
| POST | `/auth/resend-otp` | Public | Resend OTP |
| POST | `/auth/login` | Public | Login with email **or** phone + password |
| POST | `/auth/google` | Public | Google OAuth (`accessToken` from Google) |
| POST | `/auth/refresh` | Refresh token | Rotate tokens |
| POST | `/auth/logout` | Customer | Logout |
| POST | `/auth/forgot-password` | Public | Request password reset |
| POST | `/auth/reset-password` | Public | Reset with email + token + new password |
| POST | `/auth/change-password` | Customer | Change password |
| GET | `/auth/me` | Customer | Current profile |

### Example — register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+96181428503",
  "password": "Password123!"
}
```

### Example — login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "Password123!"
}
```

### Example — verify email

```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "email": "jane@example.com",
  "otp": "123456"
}
```

---

## 5. Catalog

### 5.1 Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Optional | List / filter products |
| GET | `/products/:slug` | Optional | Product detail by slug (Scosha `sco-*` codes) |
| GET | `/products/:id/related` | Optional | Related products |
| GET | `/products/:productId/reviews` | Optional | Reviews for a product |

**Useful query params for `GET /products`:**

| Param | Notes |
|-------|--------|
| `page`, `limit` | Pagination (`limit` up to **500**) |
| `sort` | e.g. `newest`, `popular`, `price_asc`, `price_desc`, `name`, `rating` |
| `category`, `subCategory` | Slug filters (comma-separated subcategories supported) |
| `brand` | Brand slug |
| `search` / `q` | Text search |
| `minPrice`, `maxPrice` | Price range |
| `color`, `size` | Variant filters |
| `featured`, `newArrival`, `bestSeller` | Flags |
| `inStock` | Stock filter |

**Slug note:** Product URLs use Scosha catalog codes ending in `-sco-{kind}-{nnnn}` (e.g. `-sco-clo-0058`). Legacy `ama`/`pup` URL tails are accepted and normalized to `sco`.

### 5.2 Categories / brands / collections

| Method | Path |
|--------|------|
| GET | `/categories`, `/categories/tree`, `/categories/:slug` |
| GET | `/brands`, `/brands/:slug` |
| GET | `/collections`, `/collections/:slug` |

### 5.3 Size charts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/size-charts` | List active charts |
| GET | `/size-charts/resolve` | Resolve chart by product context |
| GET | `/size-charts/:id` | Chart detail |

### 5.4 Search

| Method | Path |
|--------|------|
| GET | `/search?q=` |
| GET | `/search/suggestions?q=` |

---

## 6. Cart — `/cart`

Works for **guests** (cookie / `X-Guest-Session-Id`) and **logged-in customers**.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cart` | Get cart |
| POST | `/cart/items` | Add item (`variantId`, `quantity`) |
| PATCH | `/cart/items/:itemId` | Update quantity |
| DELETE | `/cart/items/:itemId` | Remove item |
| DELETE | `/cart` | Clear cart |
| POST | `/cart/merge` | Merge guest → customer (auth required) |

### Example — add to cart

```http
POST /api/v1/cart/items
Content-Type: application/json
X-Guest-Session-Id: 550e8400-e29b-41d4-a716-446655440000

{
  "variantId": 123,
  "quantity": 1
}
```

---

## 7. Wishlist — `/wishlist`

Requires **customer JWT**.

| Method | Path |
|--------|------|
| GET | `/wishlist` |
| POST | `/wishlist/:productId` |
| DELETE | `/wishlist/:productId` |
| POST | `/wishlist/:productId/move-to-cart` |

---

## 8. Addresses — `/addresses`

Requires **customer JWT**.

| Method | Path |
|--------|------|
| GET | `/addresses` |
| GET | `/addresses/:id` |
| POST | `/addresses` |
| PUT | `/addresses/:id` |
| PATCH | `/addresses/:id/default` |
| DELETE | `/addresses/:id` |

---

## 9. Orders (COD) — `/orders`

Requires **customer JWT**. Creating an order also requires **verified email**.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orders/preview` | Preview totals (delivery, coupon) |
| POST | `/orders` | Place COD order |
| GET | `/orders` | My orders |
| GET | `/orders/:id` | Order detail |

> Customers **cannot** cancel orders. Cancellation is admin-only via `/admin/orders/:id/status`.

### Example — create order

```http
POST /api/v1/orders
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "addressId": 12,
  "deliveryMethod": "standard",
  "couponCode": "SCOSHA10",
  "notes": "Call on arrival"
}
```

`deliveryMethod`: `standard` | `express`  
Payment: **COD**

---

## 10. Coupons & reviews

| Method | Path | Auth |
|--------|------|------|
| POST | `/coupons/validate` | Public |
| GET | `/reviews` | Public |
| POST | `/reviews` | Customer |
| PUT / DELETE | `/reviews/:id` | Customer (own) |

---

## 11. Content & settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/homepage` | Homepage sections payload |
| GET | `/banners` | Banners |
| GET | `/pages/:slug` | CMS page |
| GET | `/blogs`, `/blogs/:slug` | Blog |
| GET | `/faqs` | FAQs |
| GET | `/settings` | Public store settings |
| POST | `/contact` | Contact form |
| POST | `/newsletter/subscribe` | Newsletter |

---

## 12. VIP (SCOSHA-specific)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/vip/check` | Public | Check if email is VIP |
| GET | `/vip/me` | Customer | Current VIP status |
| POST | `/vip/congrats/ack` | Customer + verified | Acknowledge VIP welcome |

Admin VIP tools live under `/admin/vip/*` (list/update VIP customers, broadcast drops).

---

## 13. AI Assistant (SCOSHA-specific)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/ai-assistant/status` | Optional | Feature availability |
| POST | `/ai-assistant/analyze` | Optional | Image analysis + product suggestions (multipart) |
| POST | `/ai-assistant/try-on` | Optional | Virtual try-on (multipart; Perfect Corp) |

---

## 14. Admin API — `/admin`

Base: `/api/v1/admin`  
Auth: Admin JWT + module permissions.

### 14.1 Admin auth

| Method | Path |
|--------|------|
| POST | `/admin/auth/login` |
| POST | `/admin/auth/refresh` |
| POST | `/admin/auth/logout` |
| GET | `/admin/auth/me` |
| POST | `/admin/auth/change-password` |

### 14.2 Modules (summary)

| Area | Base path | Typical operations |
|------|-----------|--------------------|
| Products & variants | `/admin/products` | CRUD, flags, SEO, related, variants |
| Size charts | `/admin/size-charts` | CRUD |
| Categories | `/admin/categories` | CRUD, tree, reorder, status |
| Brands | `/admin/brands` | CRUD, status |
| Collections | `/admin/collections` | CRUD, featured, status |
| Media | `/admin/media` | List, upload, replace, delete |
| Inventory | `/admin/inventory` | List, set stock, adjust |
| Orders | `/admin/orders` | List, status, refund, tracking |
| Customers | `/admin/customers` | List, get, delete |
| VIP | `/admin/vip` | VIP customers, broadcast |
| Coupons | `/admin/coupons` | CRUD |
| Reviews | `/admin/reviews` | Approve / reject / reply |
| Content | `/admin/homepage-sections`, `/banners`, `/pages`, `/blogs`, `/faqs` | CRUD |
| Contact | `/admin/contact-messages` | List, read, reply |
| Newsletter | `/admin/newsletter` | List, export |
| Settings | `/admin/settings` | Get / put |
| Dashboard | `/admin/dashboard/*` | Stats, charts, widgets |
| Reports | `/admin/reports/:type` | Exports |
| Roles / admins | `/admin/roles`, `/admin/permissions`, `/admin/admins` | RBAC |
| Logs | `/admin/audit-logs`, `/admin/activity-logs` | Audit |
| Notifications | `/admin/notifications` | In-app admin alerts |

**Report `:type` examples:** `sales`, `revenue`, `orders`, `customers`, `products`, `inventory`, `top-products`, `top-by-category`, `top-by-theme`, `dsr`, `weekly`, `pnl`, `kpis`, …

---

## 15. Health & media

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API + DB health |
| GET | `/` (host root) | Service banner + docs link |
| GET | `/media/*` | Static / uploaded media (outside `/api/v1`) |

---

## 16. Quick integration checklist

1. Use **separate** SCOSHA API host / credentials (never Amaz).
2. Storefront: use Bearer token after login/verify.
3. Guest shopping: send `X-Guest-Session-Id` if cookies are unreliable; call `/cart/merge` after login.
4. Product slugs: prefer `-sco-` catalog codes.
5. Checkout: verified email + address + COD.
6. Explore live docs at `/api/docs` while integrating.

---

## 17. Support

- Email: **Scosha.support@gmail.com**
- WhatsApp: **+961 81 428 503**

---

*Document generated for SCOSHA client delivery. Paths are relative to `/api/v1` unless noted.*
