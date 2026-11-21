# Scosha - Bug Report

| ID | Severity | Case ID | Area | Steps | Expected | Actual | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEF-S01 | P2 | CAT/PDP mobile | Storefront PDP @ ~375px | Open in-stock PDP; tap size chip (e.g. XL) near bottom | Size selects cleanly | Layout squeeze / fixed action bar directly over bottom nav bar (`Saved` / bottom bar) | Browser session mobile 2026-10-12 | Open |
| DEF-S02 | P2 | ADM Dashboard | Admin Dashboard | Login admin; inspect Revenue vs Latest orders | Revenue reflects order totals or clear subtitle ("Paid only") | Revenue displays `$0.00` while Latest orders list non-zero Pending totals ($48.00, $84.60, etc.) without clarification | Admin dashboard screenshot | Open |
| DEF-S03 | P3 | CH Cart drawer | Cart drawer chrome | Navigate shop/PDP/checkout | Cart closed unless user opens it; Close usable | Cart often present in a11y tree; Close cart sometimes `pointer-events: none` until Esc/JS | Browser smoke | Open |
| DEF-S04 | P3 | CAT Catalog data | PDP media | Open `womens-warm-winter-knit-cardigan-sco-clo-0084` | Hero image matches product type | Title is cardigan; hero shows sweatshirt-style look | PDP screenshot | Open |
| DEF-S05 | P3 | CAT Stock badge | Shop PLP | Product with all variant stock 0 (e.g. Repeat Cardigan red) | Sold out / OOS signaling | Badge shows "LOW STOCK" while all sizes are stock 0 | Browser test 2026-10-12 | Open |
| DEF-S06 | P3 | CH Cart drawer | Cart quantity increment | Add item with low stock; click '+' in drawer | User feedback when variant max stock reached | Counter halts silently without toast or limit notice | Browser test 2026-10-12 | Open |
| DEF-S07 | P3 | FT VIP Form | Footer VIP verification | Submit empty or invalid email in VIP check | Explicit accessible inline error feedback | Form does not expose clear inline accessible error attributes | Browser test 2026-10-12 | Open |

Severity: P0 critical · P1 high · P2 medium · P3 low

## Notes

- Seed admin login verified: `admin@scosha.com` / `Admin@123` at `http://localhost:5174/admin/login` (PASS).
- Unauthenticated `/checkout` redirect to `/account` login gate verified (PASS).
- Free shipping threshold bar (`$150.00`) calculation and subtotal updates on add/remove verified (PASS).
- Predictive search modal autocomplete suggestions & thumbnail rendering verified (PASS).
- Mobile 375px hamburger menu drawer, category chevrons, and bottom nav verified (PASS).
- External/Hardware-dependent flows (Google OAuth, real Phone SMS delivery, live webcam scan) left for user/device execution.

