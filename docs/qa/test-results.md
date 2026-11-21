# Scosha - Test Results

Smoke executed 2026-10-11 against local stack: API `:5000`, store `:3000`, admin `:5174`. MySQL on `:3306` schema `scosha`.

| Suite | Total | PASS | FAIL | BLOCKED | NOT RUN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Manual Part 1 (critical smoke) | 8 | 7 | 1 | 0 | 1931 suite remainder |
| Manual Part 2 (critical smoke) | 6 | 5 | 1 | 0 | — |
| Manual Part 3 (critical smoke) | 4 | 4 | 0 | 0 | — |
| Manual Part 4 (critical smoke) | 2 | 2 | 0 | 0 | — |
| Manual Part 5 (critical smoke) | 4 | 3 | 1 | 0 | — |
| Manual Part 6 (authz smoke) | 1 | 1 | 0 | 0 | — |
| Manual Part 7 | — | — | — | — | Full matrices not run |
| **TOTAL (this smoke)** | **25** | **22** | **3** | **0** | **~1914** |

## Critical path checklist (smoke)

| Check | Result | Notes |
| --- | --- | --- |
| API health + products | PASS | 137 products; DB connected |
| Home loads | PASS | Hero, nav, VIP, floating AI |
| Shop PLP | PASS | Showing 137; filters/sort present |
| PDP in-stock sizes | PASS | OOS sizes disabled; XL enabled |
| Add to bag | PASS | Bag (1); subtotal $69 + ship $9 = $78 |
| Guest checkout gate | PASS | `/checkout` → `/account` Sign in |
| Skincare coming soon | PASS | Waitlist + CTAs |
| AI scan landing | PASS | Open AI Assistant / Start free scan |
| Admin login + dashboard | PASS | Orders/customers/products widgets |
| Admin API without token | PASS | 401 |
| Mobile size tap | FAIL | DEF-S01 bottom nav intercept |
| Admin revenue widget | FAIL | DEF-S02 $0 vs pending orders |
| Cart chrome stability | FAIL | DEF-S03 |

Fill remaining suite Status columns in `manual-tc-*.md` during full execution. Do not count blocked/not-run as pass.
