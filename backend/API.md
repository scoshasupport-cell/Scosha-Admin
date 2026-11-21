# SCOSHA API Overview (quick reference)

> Full client document: [`../docs/SCOSHA_API_Documentation.md`](../docs/SCOSHA_API_Documentation.md)

**Base URL:** `http://localhost:5000/api/v1`  
**Interactive docs:** `http://localhost:5000/api/docs`

## Envelope

```json
{ "success": true, "message": "...", "data": {}, "meta": { "page": 1, "limit": 12, "total": 100, "totalPages": 9 } }
```

```json
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "..." }] }
```

## Auth

- Customer: `Authorization: Bearer <token>` or cookies `accessToken` / `refreshToken`
- Admin: Bearer or cookies `adminAccessToken` / `adminRefreshToken`
- Guest cart: cookie `guestSessionId` and/or header `X-Guest-Session-Id`

## Storefront highlights

| Area | Paths |
|------|--------|
| Auth | `/auth/*` (includes Google OAuth) |
| Catalog | `/products`, `/categories`, `/brands`, `/collections`, `/size-charts`, `/search` |
| Cart / wishlist | `/cart`, `/wishlist` |
| Orders (COD) | `/orders/preview`, `/orders` |
| VIP | `/vip/*` |
| AI | `/ai-assistant/*` |
| Content | `/homepage`, `/banners`, `/pages/:slug`, `/blogs`, `/faqs`, `/contact`, `/newsletter/subscribe` |

## Admin

Mounted under `/admin/*` (products, orders, VIP, content, reports, RBAC, …).

## Notes

- SCOSHA is **independent** from Amaz (own DB, Cloudinary, SMTP, secrets).
- Product slugs use `-sco-` catalog codes.
- Customers cannot cancel orders; admins update status via `/admin/orders/:id/status`.
- Payment: **COD**.
