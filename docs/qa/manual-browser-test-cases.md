# Scosha - Exhaustive Manual Browser Test Cases (Master Index)

**Goal:** Pre-deployment coverage of every storefront control, AI flow, admin module, and cross-cutting check.

**Stack under test**
- Storefront: Next.js `http://localhost:3000`
- Admin: Vite `http://localhost:3000/admin` (or :5174/admin)
- API: Express `http://localhost:5000/api/v1`
- Payment: **Cash on Delivery only**

**Status values:** PASS / FAIL / BLOCKED / NOT RUN

## Parts

| # | File | Cases |
| --- | --- | ---: |
| 1 | [manual-tc-01-chrome-home-nav.md](./manual-tc-01-chrome-home-nav.md) | 160 |
| 2 | [manual-tc-02-catalog-search-pdp.md](./manual-tc-02-catalog-search-pdp.md) | 208 |
| 3 | [manual-tc-03-auth-cart-checkout.md](./manual-tc-03-auth-cart-checkout.md) | 106 |
| 4 | [manual-tc-04-ai.md](./manual-tc-04-ai.md) | 70 |
| 5 | [manual-tc-05-admin.md](./manual-tc-05-admin.md) | 399 |
| 6 | [manual-tc-06-security-ux-journeys.md](./manual-tc-06-security-ux-journeys.md) | 186 |
| 7 | [manual-tc-07-matrices.md](./manual-tc-07-matrices.md) | 810 |
| | **TOTAL** | **1939** |

## How to run

1. From `scosha-main`: start API (:5000), storefront (:3000), admin (:5174) - e.g. `npm run dev:all`.
2. Use dedicated Customer A, Customer B, Admin accounts only (never production).
3. Keep DevTools **Console + Network** open for mutation cases.
4. Use real `sco-` product handles from your DB for PDP cases.
5. Log defects in `bug-report.md` with **Case ID** + screenshot.
6. Update the Status column as you execute.

## What is covered

1. Chrome / home / MAIN_NAV / mobile drawer / bottom nav / cart / search / footer VIP
2. Shop filters/sort/compare, PDP, coming soon, CMS/marketing, policies
3. Auth (Google/email/phone/OTP), COD checkout, account, wishlist
4. AI Scan (face/body/furniture/smart upload, try-on, rate limits)
5. Admin (every sidebar module, CRUD, orders/packing, VIP, reports)
6. Security / 6 viewports / a11y / console / E2E journeys
7. Matrices (role x page, shop x sort, order transitions, network mutations, fuzz)

Regenerate: `node scripts/generate-manual-test-cases.mjs`

Automated tests are supplemental and do **not** replace this manual suite.
