# Part 6 - Scosha security, responsive, a11y, journeys

| ID | Area | Case | Preconditions | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-0001 | XSS | Register name / script-alert-payload | As role | Submit script-alert-payload | Escaped; no script |  |
| SEC-0002 | XSS | Register name / img-onerror-payload | As role | Submit img-onerror-payload | Escaped; no script |  |
| SEC-0003 | XSS | Register name / mustache-payload | As role | Submit mustache-payload | Escaped; no script |  |
| SEC-0004 | XSS | Register name / svg-onload-payload | As role | Submit svg-onload-payload | Escaped; no script |  |
| SEC-0005 | XSS | Contact message / script-alert-payload | As role | Submit script-alert-payload | Escaped; no script |  |
| SEC-0006 | XSS | Contact message / img-onerror-payload | As role | Submit img-onerror-payload | Escaped; no script |  |
| SEC-0007 | XSS | Contact message / mustache-payload | As role | Submit mustache-payload | Escaped; no script |  |
| SEC-0008 | XSS | Contact message / svg-onload-payload | As role | Submit svg-onload-payload | Escaped; no script |  |
| SEC-0009 | XSS | Search query / script-alert-payload | As role | Submit script-alert-payload | Escaped; no script |  |
| SEC-0010 | XSS | Search query / img-onerror-payload | As role | Submit img-onerror-payload | Escaped; no script |  |
| SEC-0011 | XSS | Search query / mustache-payload | As role | Submit mustache-payload | Escaped; no script |  |
| SEC-0012 | XSS | Search query / svg-onload-payload | As role | Submit svg-onload-payload | Escaped; no script |  |
| SEC-0013 | XSS | Address line / script-alert-payload | As role | Submit script-alert-payload | Escaped; no script |  |
| SEC-0014 | XSS | Address line / img-onerror-payload | As role | Submit img-onerror-payload | Escaped; no script |  |
| SEC-0015 | XSS | Address line / mustache-payload | As role | Submit mustache-payload | Escaped; no script |  |
| SEC-0016 | XSS | Address line / svg-onload-payload | As role | Submit svg-onload-payload | Escaped; no script |  |
| SEC-0017 | XSS | Admin product name / script-alert-payload | As role | Submit script-alert-payload | Escaped; no script |  |
| SEC-0018 | XSS | Admin product name / img-onerror-payload | As role | Submit img-onerror-payload | Escaped; no script |  |
| SEC-0019 | XSS | Admin product name / mustache-payload | As role | Submit mustache-payload | Escaped; no script |  |
| SEC-0020 | XSS | Admin product name / svg-onload-payload | As role | Submit svg-onload-payload | Escaped; no script |  |
| SEC-0021 | XSS | Coupon code display / script-alert-payload | As role | Submit script-alert-payload | Escaped; no script |  |
| SEC-0022 | XSS | Coupon code display / img-onerror-payload | As role | Submit img-onerror-payload | Escaped; no script |  |
| SEC-0023 | XSS | Coupon code display / mustache-payload | As role | Submit mustache-payload | Escaped; no script |  |
| SEC-0024 | XSS | Coupon code display / svg-onload-payload | As role | Submit svg-onload-payload | Escaped; no script |  |
| SEC-0025 | Security | IDOR order | Test accounts | A opens B /orders/id | Denied |  |
| SEC-0026 | Security | IDOR address | Test accounts | Tamper address id | Denied |  |
| SEC-0027 | Security | Customer /admin | Test accounts | Visit /admin/products | Blocked |  |
| SEC-0028 | Security | Customer admin API | Test accounts | GET /admin/orders | 401/403 |  |
| SEC-0029 | Security | No token orders | Test accounts | GET /orders | 401 |  |
| SEC-0030 | Security | Open redirect | Test accounts | /account?redirect=https://evil.example | Internal only |  |
| SEC-0031 | Security | Logout token dead | Test accounts | Reuse token | 401 |  |
| SEC-0032 | Security | Login enum | Test accounts | Wrong user vs pass | Same message |  |
| SEC-0033 | Security | VIP enum | Test accounts | Random emails | No leak |  |
| SEC-0034 | Security | Forgot enum | Test accounts | Random email | Generic success |  |
| SEC-0035 | Security | Upload dangerous | Test accounts | html/svg as image | Rejected |  |
| SEC-0036 | Security | No stack to user | Test accounts | Force error | Friendly only |  |
| SEC-0037 | Security | CORS foreign origin | Test accounts | Call API foreign | Blocked if not allowlisted |  |
| UX-0038 | Responsive Phone | / @375x812 | Viewport 375x812 | Open / | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0039 | Responsive Phone | /shop @375x812 | Viewport 375x812 | Open /shop | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0040 | Responsive Phone | /account @375x812 | Viewport 375x812 | Open /account | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0041 | Responsive Phone | /checkout @375x812 | Viewport 375x812 | Open /checkout | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0042 | Responsive Phone | /wishlist @375x812 | Viewport 375x812 | Open /wishlist | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0043 | Responsive Phone | /ai-scan @375x812 | Viewport 375x812 | Open /ai-scan | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0044 | Responsive Phone | /contact @375x812 | Viewport 375x812 | Open /contact | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0045 | Responsive Phone | /skincare @375x812 | Viewport 375x812 | Open /skincare | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0046 | Responsive Phone | /electronics @375x812 | Viewport 375x812 | Open /electronics | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0047 | Responsive Phone | /gifts @375x812 | Viewport 375x812 | Open /gifts | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0048 | Responsive Phone | /loyalty @375x812 | Viewport 375x812 | Open /loyalty | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0049 | Responsive Phone | /giveaways @375x812 | Viewport 375x812 | Open /giveaways | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0050 | Responsive Phone | /about @375x812 | Viewport 375x812 | Open /about | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0051 | Responsive Phone | /admin/login @375x812 | Viewport 375x812 | Open /admin/login | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0052 | Responsive Phone | /admin/products @375x812 | Viewport 375x812 | Open /admin/products | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0053 | Responsive Phone | /admin/orders @375x812 | Viewport 375x812 | Open /admin/orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0054 | Responsive Phone | /admin/inventory @375x812 | Viewport 375x812 | Open /admin/inventory | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0055 | Responsive Phone | /orders @375x812 | Viewport 375x812 | Open /orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0056 | Responsive Phone2 | / @390x844 | Viewport 390x844 | Open / | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0057 | Responsive Phone2 | /shop @390x844 | Viewport 390x844 | Open /shop | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0058 | Responsive Phone2 | /account @390x844 | Viewport 390x844 | Open /account | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0059 | Responsive Phone2 | /checkout @390x844 | Viewport 390x844 | Open /checkout | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0060 | Responsive Phone2 | /wishlist @390x844 | Viewport 390x844 | Open /wishlist | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0061 | Responsive Phone2 | /ai-scan @390x844 | Viewport 390x844 | Open /ai-scan | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0062 | Responsive Phone2 | /contact @390x844 | Viewport 390x844 | Open /contact | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0063 | Responsive Phone2 | /skincare @390x844 | Viewport 390x844 | Open /skincare | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0064 | Responsive Phone2 | /electronics @390x844 | Viewport 390x844 | Open /electronics | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0065 | Responsive Phone2 | /gifts @390x844 | Viewport 390x844 | Open /gifts | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0066 | Responsive Phone2 | /loyalty @390x844 | Viewport 390x844 | Open /loyalty | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0067 | Responsive Phone2 | /giveaways @390x844 | Viewport 390x844 | Open /giveaways | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0068 | Responsive Phone2 | /about @390x844 | Viewport 390x844 | Open /about | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0069 | Responsive Phone2 | /admin/login @390x844 | Viewport 390x844 | Open /admin/login | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0070 | Responsive Phone2 | /admin/products @390x844 | Viewport 390x844 | Open /admin/products | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0071 | Responsive Phone2 | /admin/orders @390x844 | Viewport 390x844 | Open /admin/orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0072 | Responsive Phone2 | /admin/inventory @390x844 | Viewport 390x844 | Open /admin/inventory | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0073 | Responsive Phone2 | /orders @390x844 | Viewport 390x844 | Open /orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0074 | Responsive Tablet | / @768x1024 | Viewport 768x1024 | Open / | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0075 | Responsive Tablet | /shop @768x1024 | Viewport 768x1024 | Open /shop | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0076 | Responsive Tablet | /account @768x1024 | Viewport 768x1024 | Open /account | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0077 | Responsive Tablet | /checkout @768x1024 | Viewport 768x1024 | Open /checkout | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0078 | Responsive Tablet | /wishlist @768x1024 | Viewport 768x1024 | Open /wishlist | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0079 | Responsive Tablet | /ai-scan @768x1024 | Viewport 768x1024 | Open /ai-scan | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0080 | Responsive Tablet | /contact @768x1024 | Viewport 768x1024 | Open /contact | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0081 | Responsive Tablet | /skincare @768x1024 | Viewport 768x1024 | Open /skincare | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0082 | Responsive Tablet | /electronics @768x1024 | Viewport 768x1024 | Open /electronics | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0083 | Responsive Tablet | /gifts @768x1024 | Viewport 768x1024 | Open /gifts | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0084 | Responsive Tablet | /loyalty @768x1024 | Viewport 768x1024 | Open /loyalty | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0085 | Responsive Tablet | /giveaways @768x1024 | Viewport 768x1024 | Open /giveaways | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0086 | Responsive Tablet | /about @768x1024 | Viewport 768x1024 | Open /about | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0087 | Responsive Tablet | /admin/login @768x1024 | Viewport 768x1024 | Open /admin/login | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0088 | Responsive Tablet | /admin/products @768x1024 | Viewport 768x1024 | Open /admin/products | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0089 | Responsive Tablet | /admin/orders @768x1024 | Viewport 768x1024 | Open /admin/orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0090 | Responsive Tablet | /admin/inventory @768x1024 | Viewport 768x1024 | Open /admin/inventory | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0091 | Responsive Tablet | /orders @768x1024 | Viewport 768x1024 | Open /orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0092 | Responsive TabletLand | / @1024x768 | Viewport 1024x768 | Open / | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0093 | Responsive TabletLand | /shop @1024x768 | Viewport 1024x768 | Open /shop | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0094 | Responsive TabletLand | /account @1024x768 | Viewport 1024x768 | Open /account | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0095 | Responsive TabletLand | /checkout @1024x768 | Viewport 1024x768 | Open /checkout | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0096 | Responsive TabletLand | /wishlist @1024x768 | Viewport 1024x768 | Open /wishlist | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0097 | Responsive TabletLand | /ai-scan @1024x768 | Viewport 1024x768 | Open /ai-scan | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0098 | Responsive TabletLand | /contact @1024x768 | Viewport 1024x768 | Open /contact | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0099 | Responsive TabletLand | /skincare @1024x768 | Viewport 1024x768 | Open /skincare | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0100 | Responsive TabletLand | /electronics @1024x768 | Viewport 1024x768 | Open /electronics | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0101 | Responsive TabletLand | /gifts @1024x768 | Viewport 1024x768 | Open /gifts | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0102 | Responsive TabletLand | /loyalty @1024x768 | Viewport 1024x768 | Open /loyalty | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0103 | Responsive TabletLand | /giveaways @1024x768 | Viewport 1024x768 | Open /giveaways | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0104 | Responsive TabletLand | /about @1024x768 | Viewport 1024x768 | Open /about | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0105 | Responsive TabletLand | /admin/login @1024x768 | Viewport 1024x768 | Open /admin/login | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0106 | Responsive TabletLand | /admin/products @1024x768 | Viewport 1024x768 | Open /admin/products | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0107 | Responsive TabletLand | /admin/orders @1024x768 | Viewport 1024x768 | Open /admin/orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0108 | Responsive TabletLand | /admin/inventory @1024x768 | Viewport 1024x768 | Open /admin/inventory | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0109 | Responsive TabletLand | /orders @1024x768 | Viewport 1024x768 | Open /orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0110 | Responsive Laptop | / @1366x768 | Viewport 1366x768 | Open / | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0111 | Responsive Laptop | /shop @1366x768 | Viewport 1366x768 | Open /shop | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0112 | Responsive Laptop | /account @1366x768 | Viewport 1366x768 | Open /account | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0113 | Responsive Laptop | /checkout @1366x768 | Viewport 1366x768 | Open /checkout | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0114 | Responsive Laptop | /wishlist @1366x768 | Viewport 1366x768 | Open /wishlist | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0115 | Responsive Laptop | /ai-scan @1366x768 | Viewport 1366x768 | Open /ai-scan | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0116 | Responsive Laptop | /contact @1366x768 | Viewport 1366x768 | Open /contact | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0117 | Responsive Laptop | /skincare @1366x768 | Viewport 1366x768 | Open /skincare | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0118 | Responsive Laptop | /electronics @1366x768 | Viewport 1366x768 | Open /electronics | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0119 | Responsive Laptop | /gifts @1366x768 | Viewport 1366x768 | Open /gifts | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0120 | Responsive Laptop | /loyalty @1366x768 | Viewport 1366x768 | Open /loyalty | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0121 | Responsive Laptop | /giveaways @1366x768 | Viewport 1366x768 | Open /giveaways | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0122 | Responsive Laptop | /about @1366x768 | Viewport 1366x768 | Open /about | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0123 | Responsive Laptop | /admin/login @1366x768 | Viewport 1366x768 | Open /admin/login | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0124 | Responsive Laptop | /admin/products @1366x768 | Viewport 1366x768 | Open /admin/products | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0125 | Responsive Laptop | /admin/orders @1366x768 | Viewport 1366x768 | Open /admin/orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0126 | Responsive Laptop | /admin/inventory @1366x768 | Viewport 1366x768 | Open /admin/inventory | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0127 | Responsive Laptop | /orders @1366x768 | Viewport 1366x768 | Open /orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0128 | Responsive Desktop | / @1920x1080 | Viewport 1920x1080 | Open / | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0129 | Responsive Desktop | /shop @1920x1080 | Viewport 1920x1080 | Open /shop | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0130 | Responsive Desktop | /account @1920x1080 | Viewport 1920x1080 | Open /account | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0131 | Responsive Desktop | /checkout @1920x1080 | Viewport 1920x1080 | Open /checkout | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0132 | Responsive Desktop | /wishlist @1920x1080 | Viewport 1920x1080 | Open /wishlist | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0133 | Responsive Desktop | /ai-scan @1920x1080 | Viewport 1920x1080 | Open /ai-scan | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0134 | Responsive Desktop | /contact @1920x1080 | Viewport 1920x1080 | Open /contact | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0135 | Responsive Desktop | /skincare @1920x1080 | Viewport 1920x1080 | Open /skincare | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0136 | Responsive Desktop | /electronics @1920x1080 | Viewport 1920x1080 | Open /electronics | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0137 | Responsive Desktop | /gifts @1920x1080 | Viewport 1920x1080 | Open /gifts | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0138 | Responsive Desktop | /loyalty @1920x1080 | Viewport 1920x1080 | Open /loyalty | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0139 | Responsive Desktop | /giveaways @1920x1080 | Viewport 1920x1080 | Open /giveaways | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0140 | Responsive Desktop | /about @1920x1080 | Viewport 1920x1080 | Open /about | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0141 | Responsive Desktop | /admin/login @1920x1080 | Viewport 1920x1080 | Open /admin/login | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0142 | Responsive Desktop | /admin/products @1920x1080 | Viewport 1920x1080 | Open /admin/products | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0143 | Responsive Desktop | /admin/orders @1920x1080 | Viewport 1920x1080 | Open /admin/orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0144 | Responsive Desktop | /admin/inventory @1920x1080 | Viewport 1920x1080 | Open /admin/inventory | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0145 | Responsive Desktop | /orders @1920x1080 | Viewport 1920x1080 | Open /orders | No horizontal overflow; actions reachable; bottom nav OK on phone |  |
| UX-0146 | A11y | Tab header | Storefront | Tab | Focus visible |  |
| UX-0147 | A11y | Tab account form | Storefront | Tab | Logical |  |
| UX-0148 | A11y | Enter/Space buttons | Storefront | Activate | Works |  |
| UX-0149 | A11y | Esc drawers/modals | Storefront | Esc | Closes |  |
| UX-0150 | A11y | Focus restore | Storefront | Close drawer | Back to opener |  |
| UX-0151 | A11y | Labels account/checkout | Storefront | Inspect | Labelled |  |
| UX-0152 | A11y | H1 home | Storefront | Inspect | Present |  |
| UX-0153 | A11y | Contrast | Storefront | Visual | Readable |  |
| UX-0154 | Console | Load / | Apps up | Open / | No Scosha app exceptions |  |
| UX-0155 | Network | No 5xx / | Apps up | Network | No unexpected 5xx |  |
| UX-0156 | Console | Load /shop | Apps up | Open /shop | No Scosha app exceptions |  |
| UX-0157 | Network | No 5xx /shop | Apps up | Network | No unexpected 5xx |  |
| UX-0158 | Console | Load /account | Apps up | Open /account | No Scosha app exceptions |  |
| UX-0159 | Network | No 5xx /account | Apps up | Network | No unexpected 5xx |  |
| UX-0160 | Console | Load /checkout | Apps up | Open /checkout | No Scosha app exceptions |  |
| UX-0161 | Network | No 5xx /checkout | Apps up | Network | No unexpected 5xx |  |
| UX-0162 | Console | Load /ai-scan | Apps up | Open /ai-scan | No Scosha app exceptions |  |
| UX-0163 | Network | No 5xx /ai-scan | Apps up | Network | No unexpected 5xx |  |
| UX-0164 | Console | Load /admin | Apps up | Open /admin | No Scosha app exceptions |  |
| UX-0165 | Network | No 5xx /admin | Apps up | Network | No unexpected 5xx |  |
| UX-0166 | Console | Load /admin/orders | Apps up | Open /admin/orders | No Scosha app exceptions |  |
| UX-0167 | Network | No 5xx /admin/orders | Apps up | Network | No unexpected 5xx |  |
| UX-0168 | Console | Load /admin/products | Apps up | Open /admin/products | No Scosha app exceptions |  |
| UX-0169 | Network | No 5xx /admin/products | Apps up | Network | No unexpected 5xx |  |
| E2E-0170 | Journey | J1 | Fresh fixtures | Guest Women shop PDP Add Checkout-gate Register Verify Place COD Confirm Admin status update Customer sees | Full success; API/DB consistent |  |
| E2E-0171 | Journey | J2 | Fresh fixtures | Search predictive View all Filter In stock Sort price Compare 2 Buy COD | Full success; API/DB consistent |  |
| E2E-0172 | Journey | J3 | Fresh fixtures | AI Body results Add Checkout COD | Full success; API/DB consistent |  |
| E2E-0173 | Journey | J4 | Fresh fixtures | AI Furniture Home textiles PDP | Full success; API/DB consistent |  |
| E2E-0174 | Journey | J5 | Fresh fixtures | AI Face beauty suggestions Coming soon skincare CTAs | Full success; API/DB consistent |  |
| E2E-0175 | Journey | J6 | Fresh fixtures | Admin create product Storefront /shop shows Guest buys last unit Second fails | Full success; API/DB consistent |  |
| E2E-0176 | Journey | J7 | Fresh fixtures | Admin coupon Customer applies at checkout | Full success; API/DB consistent |  |
| E2E-0177 | Journey | J8 | Fresh fixtures | Contact form Admin mark read | Full success; API/DB consistent |  |
| E2E-0178 | Journey | J9 | Fresh fixtures | Newsletter VIP check Footer Admin export CSV | Full success; API/DB consistent |  |
| E2E-0179 | Journey | J10 | Fresh fixtures | VIP $300 order Congrats modal Ack Footer VIP true | Full success; API/DB consistent |  |
| E2E-0180 | Journey | J11 | Fresh fixtures | Forgot reset Login new password | Full success; API/DB consistent |  |
| E2E-0181 | Journey | J12 | Fresh fixtures | Guest cart Login merge Place COD | Full success; API/DB consistent |  |
| E2E-0182 | Journey | J13 | Fresh fixtures | Mobile 375 bottom-nav full purchase | Full success; API/DB consistent |  |
| E2E-0183 | Journey | J14 | Fresh fixtures | Limited admin cannot open Settings/Admins | Full success; API/DB consistent |  |
| E2E-0184 | Journey | J15 | Fresh fixtures | Two browsers stock=1 race one wins | Full success; API/DB consistent |  |
| E2E-0185 | Journey | J16 | Fresh fixtures | Skincare waitlist + Electronics waitlist | Full success; API/DB consistent |  |
| E2E-0186 | Journey | J17 | Fresh fixtures | Loyalty/Gifts/Giveaways pages to shop CTAs | Full success; API/DB consistent |  |
