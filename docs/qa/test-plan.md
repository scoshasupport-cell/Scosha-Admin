# Scosha - Pre-Deployment Manual QA Test Plan

## Environment

| App | URL |
| --- | --- |
| Storefront | http://localhost:3000 |
| Admin | http://localhost:3000/admin |
| API | http://localhost:5000/api/v1 |
| DB | MySQL (Docker often host port 3307 / db `scosha`) |

## Roles

1. Guest
2. Customer A / Customer B
3. Administrator
4. Limited-permission admin

## Critical rules

- Payment under test is **COD only** (ignore unimplemented Apple Pay promo text).
- Do not use Amaz credentials/DB/Cloudinary for Scosha.
- Mark PASS only after verifying UI + Network where mutations apply.

## Coverage

See `manual-browser-test-cases.md` (exhaustive 7-part suite; regenerate for live total).
