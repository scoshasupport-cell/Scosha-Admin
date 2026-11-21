# Part 5 - Scosha admin panel exhaustive

| ID | Area | Case | Preconditions | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ADM-0001 | Auth | Login page | Logged out | http://localhost:3000/admin/login | Email Password Sign in |  |
| ADM-0002 | Auth | Empty submit | Admin | Submit | Validation |  |
| ADM-0003 | Auth | Wrong password | Admin | Wrong | Error |  |
| ADM-0004 | Auth | Valid login | Admin | Seed admin | Dashboard |  |
| ADM-0005 | Auth | Logout | Admin | Logout | Login |  |
| ADM-0006 | Auth | Deep link guard | Admin | Logged out /admin/products | Redirect login |  |
| ADM-0007 | Auth | Session F5 | Admin | F5 | Stays |  |
| ADM-0008 | Auth | Via :5174 | Admin | http://localhost:5174/admin/login | Works |  |
| ADM-0009 | Auth | Via :3000/admin | Admin | http://localhost:3000/admin/login | Works |  |
| ADM-0010 | Nav | Open Dashboard | Admin | Sidebar Dashboard | Loads |  |
| ADM-0011 | Nav | Refresh Dashboard | On page | F5 | Auth OK |  |
| ADM-0012 | Nav | Console Dashboard | On page | Console | No app errors |  |
| ADM-0013 | Nav | Mobile Dashboard | 390px | Open Dashboard | Usable |  |
| ADM-0014 | Nav | Open Products | Admin | Sidebar Products | Loads |  |
| ADM-0015 | Nav | Refresh Products | On page | F5 | Auth OK |  |
| ADM-0016 | Nav | Console Products | On page | Console | No app errors |  |
| ADM-0017 | Nav | Mobile Products | 390px | Open Products | Usable |  |
| ADM-0018 | Nav | Open Size Charts | Admin | Sidebar Size Charts | Loads |  |
| ADM-0019 | Nav | Refresh Size Charts | On page | F5 | Auth OK |  |
| ADM-0020 | Nav | Console Size Charts | On page | Console | No app errors |  |
| ADM-0021 | Nav | Mobile Size Charts | 390px | Open Size Charts | Usable |  |
| ADM-0022 | Nav | Open Categories | Admin | Sidebar Categories | Loads |  |
| ADM-0023 | Nav | Refresh Categories | On page | F5 | Auth OK |  |
| ADM-0024 | Nav | Console Categories | On page | Console | No app errors |  |
| ADM-0025 | Nav | Mobile Categories | 390px | Open Categories | Usable |  |
| ADM-0026 | Nav | Open Brands | Admin | Sidebar Brands | Loads |  |
| ADM-0027 | Nav | Refresh Brands | On page | F5 | Auth OK |  |
| ADM-0028 | Nav | Console Brands | On page | Console | No app errors |  |
| ADM-0029 | Nav | Mobile Brands | 390px | Open Brands | Usable |  |
| ADM-0030 | Nav | Open Collections | Admin | Sidebar Collections | Loads |  |
| ADM-0031 | Nav | Refresh Collections | On page | F5 | Auth OK |  |
| ADM-0032 | Nav | Console Collections | On page | Console | No app errors |  |
| ADM-0033 | Nav | Mobile Collections | 390px | Open Collections | Usable |  |
| ADM-0034 | Nav | Open Orders | Admin | Sidebar Orders | Loads |  |
| ADM-0035 | Nav | Refresh Orders | On page | F5 | Auth OK |  |
| ADM-0036 | Nav | Console Orders | On page | Console | No app errors |  |
| ADM-0037 | Nav | Mobile Orders | 390px | Open Orders | Usable |  |
| ADM-0038 | Nav | Open Customers | Admin | Sidebar Customers | Loads |  |
| ADM-0039 | Nav | Refresh Customers | On page | F5 | Auth OK |  |
| ADM-0040 | Nav | Console Customers | On page | Console | No app errors |  |
| ADM-0041 | Nav | Mobile Customers | 390px | Open Customers | Usable |  |
| ADM-0042 | Nav | Open VIP Customers | Admin | Sidebar VIP Customers | Loads |  |
| ADM-0043 | Nav | Refresh VIP Customers | On page | F5 | Auth OK |  |
| ADM-0044 | Nav | Console VIP Customers | On page | Console | No app errors |  |
| ADM-0045 | Nav | Mobile VIP Customers | 390px | Open VIP Customers | Usable |  |
| ADM-0046 | Nav | Open Reviews | Admin | Sidebar Reviews | Loads |  |
| ADM-0047 | Nav | Refresh Reviews | On page | F5 | Auth OK |  |
| ADM-0048 | Nav | Console Reviews | On page | Console | No app errors |  |
| ADM-0049 | Nav | Mobile Reviews | 390px | Open Reviews | Usable |  |
| ADM-0050 | Nav | Open Coupons | Admin | Sidebar Coupons | Loads |  |
| ADM-0051 | Nav | Refresh Coupons | On page | F5 | Auth OK |  |
| ADM-0052 | Nav | Console Coupons | On page | Console | No app errors |  |
| ADM-0053 | Nav | Mobile Coupons | 390px | Open Coupons | Usable |  |
| ADM-0054 | Nav | Open Inventory | Admin | Sidebar Inventory | Loads |  |
| ADM-0055 | Nav | Refresh Inventory | On page | F5 | Auth OK |  |
| ADM-0056 | Nav | Console Inventory | On page | Console | No app errors |  |
| ADM-0057 | Nav | Mobile Inventory | 390px | Open Inventory | Usable |  |
| ADM-0058 | Nav | Open Media | Admin | Sidebar Media | Loads |  |
| ADM-0059 | Nav | Refresh Media | On page | F5 | Auth OK |  |
| ADM-0060 | Nav | Console Media | On page | Console | No app errors |  |
| ADM-0061 | Nav | Mobile Media | 390px | Open Media | Usable |  |
| ADM-0062 | Nav | Open Homepage | Admin | Sidebar Homepage | Loads |  |
| ADM-0063 | Nav | Refresh Homepage | On page | F5 | Auth OK |  |
| ADM-0064 | Nav | Console Homepage | On page | Console | No app errors |  |
| ADM-0065 | Nav | Mobile Homepage | 390px | Open Homepage | Usable |  |
| ADM-0066 | Nav | Open Pages | Admin | Sidebar Pages | Loads |  |
| ADM-0067 | Nav | Refresh Pages | On page | F5 | Auth OK |  |
| ADM-0068 | Nav | Console Pages | On page | Console | No app errors |  |
| ADM-0069 | Nav | Mobile Pages | 390px | Open Pages | Usable |  |
| ADM-0070 | Nav | Open Blogs | Admin | Sidebar Blogs | Loads |  |
| ADM-0071 | Nav | Refresh Blogs | On page | F5 | Auth OK |  |
| ADM-0072 | Nav | Console Blogs | On page | Console | No app errors |  |
| ADM-0073 | Nav | Mobile Blogs | 390px | Open Blogs | Usable |  |
| ADM-0074 | Nav | Open FAQs | Admin | Sidebar FAQs | Loads |  |
| ADM-0075 | Nav | Refresh FAQs | On page | F5 | Auth OK |  |
| ADM-0076 | Nav | Console FAQs | On page | Console | No app errors |  |
| ADM-0077 | Nav | Mobile FAQs | 390px | Open FAQs | Usable |  |
| ADM-0078 | Nav | Open Contact | Admin | Sidebar Contact | Loads |  |
| ADM-0079 | Nav | Refresh Contact | On page | F5 | Auth OK |  |
| ADM-0080 | Nav | Console Contact | On page | Console | No app errors |  |
| ADM-0081 | Nav | Mobile Contact | 390px | Open Contact | Usable |  |
| ADM-0082 | Nav | Open Newsletter | Admin | Sidebar Newsletter | Loads |  |
| ADM-0083 | Nav | Refresh Newsletter | On page | F5 | Auth OK |  |
| ADM-0084 | Nav | Console Newsletter | On page | Console | No app errors |  |
| ADM-0085 | Nav | Mobile Newsletter | 390px | Open Newsletter | Usable |  |
| ADM-0086 | Nav | Open Reports | Admin | Sidebar Reports | Loads |  |
| ADM-0087 | Nav | Refresh Reports | On page | F5 | Auth OK |  |
| ADM-0088 | Nav | Console Reports | On page | Console | No app errors |  |
| ADM-0089 | Nav | Mobile Reports | 390px | Open Reports | Usable |  |
| ADM-0090 | Nav | Open Notifications | Admin | Sidebar Notifications | Loads |  |
| ADM-0091 | Nav | Refresh Notifications | On page | F5 | Auth OK |  |
| ADM-0092 | Nav | Console Notifications | On page | Console | No app errors |  |
| ADM-0093 | Nav | Mobile Notifications | 390px | Open Notifications | Usable |  |
| ADM-0094 | Nav | Open Roles | Admin | Sidebar Roles | Loads |  |
| ADM-0095 | Nav | Refresh Roles | On page | F5 | Auth OK |  |
| ADM-0096 | Nav | Console Roles | On page | Console | No app errors |  |
| ADM-0097 | Nav | Mobile Roles | 390px | Open Roles | Usable |  |
| ADM-0098 | Nav | Open Admins | Admin | Sidebar Admins | Loads |  |
| ADM-0099 | Nav | Refresh Admins | On page | F5 | Auth OK |  |
| ADM-0100 | Nav | Console Admins | On page | Console | No app errors |  |
| ADM-0101 | Nav | Mobile Admins | 390px | Open Admins | Usable |  |
| ADM-0102 | Nav | Open Settings | Admin | Sidebar Settings | Loads |  |
| ADM-0103 | Nav | Refresh Settings | On page | F5 | Auth OK |  |
| ADM-0104 | Nav | Console Settings | On page | Console | No app errors |  |
| ADM-0105 | Nav | Mobile Settings | 390px | Open Settings | Usable |  |
| ADM-0106 | Nav | Open Profile | Admin | Sidebar Profile | Loads |  |
| ADM-0107 | Nav | Refresh Profile | On page | F5 | Auth OK |  |
| ADM-0108 | Nav | Console Profile | On page | Console | No app errors |  |
| ADM-0109 | Nav | Mobile Profile | 390px | Open Profile | Usable |  |
| ADM-0110 | Dashboard | Stats | Admin | Inspect | Renders |  |
| ADM-0111 | Dashboard | Charts | Admin | Inspect | Renders |  |
| ADM-0112 | Dashboard | Latest orders | Admin | Inspect | Renders |  |
| ADM-0113 | Dashboard | Top products | Admin | Inspect | Renders |  |
| ADM-0114 | Dashboard | Low stock | Admin | Inspect | Renders |  |
| ADM-0115 | Dashboard | Recent customers | Admin | Inspect | Renders |  |
| ADM-0116 | Products | List | Admin | Open | Visible |  |
| ADM-0117 | Products | Search hit | Admin | Known | Filters |  |
| ADM-0118 | Products | Search miss | Admin | zzzqa | Empty |  |
| ADM-0119 | Products | Clear search | Admin | Clear | Full list |  |
| ADM-0120 | Products | Add product open | Admin | Click Add product | Form |  |
| ADM-0121 | Products | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0122 | Products | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0123 | Products | Edit open | Admin | Edit | Prefill |  |
| ADM-0124 | Products | Edit save | Admin | Change save | Persists |  |
| ADM-0125 | Products | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0126 | Products | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0127 | Products | Pagination | Admin | If many | Works |  |
| ADM-0128 | Products | Status filter | Admin | If present | Filters |  |
| ADM-0129 | Product form | Field Name | Form | Set Name | Validates/saves |  |
| ADM-0130 | Product form | Field Slug | Form | Set Slug | Validates/saves |  |
| ADM-0131 | Product form | Field Description | Form | Set Description | Validates/saves |  |
| ADM-0132 | Product form | Field Images | Form | Set Images | Validates/saves |  |
| ADM-0133 | Product form | Field Tags | Form | Set Tags | Validates/saves |  |
| ADM-0134 | Product form | Field Brand | Form | Set Brand | Validates/saves |  |
| ADM-0135 | Product form | Field Category | Form | Set Category | Validates/saves |  |
| ADM-0136 | Product form | Field Subcategory | Form | Set Subcategory | Validates/saves |  |
| ADM-0137 | Product form | Field Status | Form | Set Status | Validates/saves |  |
| ADM-0138 | Product form | Field Badge | Form | Set Badge | Validates/saves |  |
| ADM-0139 | Product form | Field Base price | Form | Set Base price | Validates/saves |  |
| ADM-0140 | Product form | Field Compare at | Form | Set Compare at | Validates/saves |  |
| ADM-0141 | Product form | Status draft | Form | Set draft | Storefront visibility matches |  |
| ADM-0142 | Product form | Status active | Form | Set active | Storefront visibility matches |  |
| ADM-0143 | Product form | Status archived | Form | Set archived | Storefront visibility matches |  |
| ADM-0144 | Product form | Add variant | Admin | Size/color/price/stock | Added |  |
| ADM-0145 | Product form | Save stock | Admin | Save stock | Updates |  |
| ADM-0146 | Product form | Delete variant | Admin | Delete | Gone |  |
| ADM-0147 | Product form | Live storefront | Admin | Active+stock | Purchasable on /shop |  |
| ADM-0148 | Product form | sco- handle | Admin | Create | Handle uses sco convention |  |
| ADM-0149 | Size Charts | List | Admin | Open | Visible |  |
| ADM-0150 | Size Charts | Search hit | Admin | Known | Filters |  |
| ADM-0151 | Size Charts | Search miss | Admin | zzzqa | Empty |  |
| ADM-0152 | Size Charts | Clear search | Admin | Clear | Full list |  |
| ADM-0153 | Size Charts | Add size chart open | Admin | Click Add size chart | Form |  |
| ADM-0154 | Size Charts | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0155 | Size Charts | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0156 | Size Charts | Edit open | Admin | Edit | Prefill |  |
| ADM-0157 | Size Charts | Edit save | Admin | Change save | Persists |  |
| ADM-0158 | Size Charts | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0159 | Size Charts | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0160 | Size Charts | Pagination | Admin | If many | Works |  |
| ADM-0161 | Size Charts | Status filter | Admin | If present | Filters |  |
| ADM-0162 | Size Chart form | Add Field | Form | Add Field | Added |  |
| ADM-0163 | Size Chart form | Add Size Row | Form | Add Size Row | Added |  |
| ADM-0164 | Size Chart form | Save | Valid | Save Size Chart | Persists |  |
| ADM-0165 | Categories | List | Admin | Open | Visible |  |
| ADM-0166 | Categories | Search hit | Admin | Known | Filters |  |
| ADM-0167 | Categories | Search miss | Admin | zzzqa | Empty |  |
| ADM-0168 | Categories | Clear search | Admin | Clear | Full list |  |
| ADM-0169 | Categories | Add category open | Admin | Click Add category | Form |  |
| ADM-0170 | Categories | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0171 | Categories | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0172 | Categories | Edit open | Admin | Edit | Prefill |  |
| ADM-0173 | Categories | Edit save | Admin | Change save | Persists |  |
| ADM-0174 | Categories | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0175 | Categories | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0176 | Categories | Pagination | Admin | If many | Works |  |
| ADM-0177 | Categories | Status filter | Admin | If present | Filters |  |
| ADM-0178 | Categories | Reorder | If UI | Reorder | API persists |  |
| ADM-0179 | Brands | List | Admin | Open | Visible |  |
| ADM-0180 | Brands | Search hit | Admin | Known | Filters |  |
| ADM-0181 | Brands | Search miss | Admin | zzzqa | Empty |  |
| ADM-0182 | Brands | Clear search | Admin | Clear | Full list |  |
| ADM-0183 | Brands | Add brand open | Admin | Click Add brand | Form |  |
| ADM-0184 | Brands | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0185 | Brands | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0186 | Brands | Edit open | Admin | Edit | Prefill |  |
| ADM-0187 | Brands | Edit save | Admin | Change save | Persists |  |
| ADM-0188 | Brands | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0189 | Brands | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0190 | Brands | Pagination | Admin | If many | Works |  |
| ADM-0191 | Brands | Status filter | Admin | If present | Filters |  |
| ADM-0192 | Collections | List | Admin | Open | Visible |  |
| ADM-0193 | Collections | Search hit | Admin | Known | Filters |  |
| ADM-0194 | Collections | Search miss | Admin | zzzqa | Empty |  |
| ADM-0195 | Collections | Clear search | Admin | Clear | Full list |  |
| ADM-0196 | Collections | Add collection open | Admin | Click Add collection | Form |  |
| ADM-0197 | Collections | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0198 | Collections | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0199 | Collections | Edit open | Admin | Edit | Prefill |  |
| ADM-0200 | Collections | Edit save | Admin | Change save | Persists |  |
| ADM-0201 | Collections | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0202 | Collections | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0203 | Collections | Pagination | Admin | If many | Works |  |
| ADM-0204 | Collections | Status filter | Admin | If present | Filters |  |
| ADM-0205 | Orders | List/search | Admin + test order | Open Orders | Rows |  |
| ADM-0206 | Orders | Filter status | Admin + test order | Pending | Filtered |  |
| ADM-0207 | Orders | Detail | Admin + test order | Open | Customer items totals |  |
| ADM-0208 | Orders | Totals match storefront | Admin + test order | Compare | Equal |  |
| ADM-0209 | Orders | COD not paid wrongly | Admin + test order | Inspect | Pending/COD |  |
| ADM-0210 | Orders | Update status | Admin + test order | Update status | Persists |  |
| ADM-0211 | Orders | Bad transition | Admin + test order | Illegal | Rejected |  |
| ADM-0212 | Orders | Save tracking | Admin + test order | Tracking Save | Persists |  |
| ADM-0213 | Orders | Packing receipt | Admin + test order | Packing receipt | PDF download |  |
| ADM-0214 | Orders | Cancel | Admin + test order | Cancel | Cancelled |  |
| ADM-0215 | Orders | Refund | Admin + test order | Refund | Safe handling |  |
| ADM-0216 | Orders | Customer sees update | Admin + test order | Customer /orders | Updated |  |
| ADM-0217 | Customers | List | Admin | Open | Visible |  |
| ADM-0218 | Customers | Search hit | Admin | Known | Filters |  |
| ADM-0219 | Customers | Search miss | Admin | zzzqa | Empty |  |
| ADM-0220 | Customers | Clear search | Admin | Clear | Full list |  |
| ADM-0221 | Customers | N/A list open | Admin | Click N/A list | Form |  |
| ADM-0222 | Customers | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0223 | Customers | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0224 | Customers | Edit open | Admin | Edit | Prefill |  |
| ADM-0225 | Customers | Edit save | Admin | Change save | Persists |  |
| ADM-0226 | Customers | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0227 | Customers | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0228 | Customers | Pagination | Admin | If many | Works |  |
| ADM-0229 | Customers | Status filter | Admin | If present | Filters |  |
| ADM-0230 | Customers | Detail | View | Orders shown | undefined |  |
| ADM-0231 | Customers | Delete | Confirm | Removed | undefined |  |
| ADM-0232 | Customers | Users alias | /admin/users | Redirects customers | undefined |  |
| ADM-0233 | VIP | List/search | Admin | Open VIP | List |  |
| ADM-0234 | VIP | Edit Save | Admin | Flags/credits Save | Persists |  |
| ADM-0235 | VIP | View customer | Admin | View | Customer detail |  |
| ADM-0236 | VIP | Announce early access | Admin | Announce Send | Broadcast handled |  |
| ADM-0237 | Reviews | Filter | Admin | Status | Filtered |  |
| ADM-0238 | Reviews | Approve | Admin | Approve | OK |  |
| ADM-0239 | Reviews | Reject | Admin | Reject | OK |  |
| ADM-0240 | Reviews | Reply send | Admin | Send reply | Saved |  |
| ADM-0241 | Coupons | List | Admin | Open | Visible |  |
| ADM-0242 | Coupons | Search hit | Admin | Known | Filters |  |
| ADM-0243 | Coupons | Search miss | Admin | zzzqa | Empty |  |
| ADM-0244 | Coupons | Clear search | Admin | Clear | Full list |  |
| ADM-0245 | Coupons | Add coupon open | Admin | Click Add coupon | Form |  |
| ADM-0246 | Coupons | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0247 | Coupons | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0248 | Coupons | Edit open | Admin | Edit | Prefill |  |
| ADM-0249 | Coupons | Edit save | Admin | Change save | Persists |  |
| ADM-0250 | Coupons | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0251 | Coupons | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0252 | Coupons | Pagination | Admin | If many | Works |  |
| ADM-0253 | Coupons | Status filter | Admin | If present | Filters |  |
| ADM-0254 | Coupons | Checkout honor | Create code | Apply at checkout | Discount |  |
| ADM-0255 | Coupons | Expired reject | Past expiry | Checkout | Rejected |  |
| ADM-0256 | Inventory | List | Admin | Open | Rows |  |
| ADM-0257 | Inventory | Set | Admin | Set | PDP matches |  |
| ADM-0258 | Inventory | +1 | Admin | +1 | Inc |  |
| ADM-0259 | Inventory | -1 | Admin | -1 | Dec |  |
| ADM-0260 | Inventory | No negative | Admin | At 0 | Blocked |  |
| ADM-0261 | Media | Upload | Admin | jpg/png | Appears |  |
| ADM-0262 | Media | Reject bad | Admin | exe | Rejected |  |
| ADM-0263 | Media | Delete | Admin | Confirm | Gone |  |
| ADM-0264 | Homepage | List | Admin | Open | Visible |  |
| ADM-0265 | Homepage | Search hit | Admin | Known | Filters |  |
| ADM-0266 | Homepage | Search miss | Admin | zzzqa | Empty |  |
| ADM-0267 | Homepage | Clear search | Admin | Clear | Full list |  |
| ADM-0268 | Homepage | Add section open | Admin | Click Add section | Form |  |
| ADM-0269 | Homepage | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0270 | Homepage | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0271 | Homepage | Edit open | Admin | Edit | Prefill |  |
| ADM-0272 | Homepage | Edit save | Admin | Change save | Persists |  |
| ADM-0273 | Homepage | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0274 | Homepage | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0275 | Homepage | Pagination | Admin | If many | Works |  |
| ADM-0276 | Homepage | Status filter | Admin | If present | Filters |  |
| ADM-0277 | Pages | List | Admin | Open | Visible |  |
| ADM-0278 | Pages | Search hit | Admin | Known | Filters |  |
| ADM-0279 | Pages | Search miss | Admin | zzzqa | Empty |  |
| ADM-0280 | Pages | Clear search | Admin | Clear | Full list |  |
| ADM-0281 | Pages | Add page open | Admin | Click Add page | Form |  |
| ADM-0282 | Pages | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0283 | Pages | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0284 | Pages | Edit open | Admin | Edit | Prefill |  |
| ADM-0285 | Pages | Edit save | Admin | Change save | Persists |  |
| ADM-0286 | Pages | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0287 | Pages | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0288 | Pages | Pagination | Admin | If many | Works |  |
| ADM-0289 | Pages | Status filter | Admin | If present | Filters |  |
| ADM-0290 | Blogs | List | Admin | Open | Visible |  |
| ADM-0291 | Blogs | Search hit | Admin | Known | Filters |  |
| ADM-0292 | Blogs | Search miss | Admin | zzzqa | Empty |  |
| ADM-0293 | Blogs | Clear search | Admin | Clear | Full list |  |
| ADM-0294 | Blogs | Add post open | Admin | Click Add post | Form |  |
| ADM-0295 | Blogs | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0296 | Blogs | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0297 | Blogs | Edit open | Admin | Edit | Prefill |  |
| ADM-0298 | Blogs | Edit save | Admin | Change save | Persists |  |
| ADM-0299 | Blogs | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0300 | Blogs | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0301 | Blogs | Pagination | Admin | If many | Works |  |
| ADM-0302 | Blogs | Status filter | Admin | If present | Filters |  |
| ADM-0303 | FAQs | List | Admin | Open | Visible |  |
| ADM-0304 | FAQs | Search hit | Admin | Known | Filters |  |
| ADM-0305 | FAQs | Search miss | Admin | zzzqa | Empty |  |
| ADM-0306 | FAQs | Clear search | Admin | Clear | Full list |  |
| ADM-0307 | FAQs | Add FAQ open | Admin | Click Add FAQ | Form |  |
| ADM-0308 | FAQs | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0309 | FAQs | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0310 | FAQs | Edit open | Admin | Edit | Prefill |  |
| ADM-0311 | FAQs | Edit save | Admin | Change save | Persists |  |
| ADM-0312 | FAQs | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0313 | FAQs | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0314 | FAQs | Pagination | Admin | If many | Works |  |
| ADM-0315 | FAQs | Status filter | Admin | If present | Filters |  |
| ADM-0316 | Contact inbox | List | After contact form | Open | Messages |  |
| ADM-0317 | Contact inbox | Mark as read | After contact form | Mark as read | Read |  |
| ADM-0318 | Contact inbox | Reply if API | After contact form | Reply | Handled |  |
| ADM-0319 | Newsletter | List | Open | List | OK |  |
| ADM-0320 | Newsletter | CSV | Export CSV | File | OK |  |
| ADM-0321 | Newsletter | Excel | Export Excel | File | OK |  |
| ADM-0322 | Reports | View Bestsellers | Admin | Open | Renders |  |
| ADM-0323 | Reports | Bestsellers CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0324 | Reports | Bestsellers Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0325 | Reports | Bestsellers PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0326 | Reports | View Daily sales | Admin | Open | Renders |  |
| ADM-0327 | Reports | Daily sales CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0328 | Reports | Daily sales Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0329 | Reports | Daily sales PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0330 | Reports | View Weekly | Admin | Open | Renders |  |
| ADM-0331 | Reports | Weekly CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0332 | Reports | Weekly Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0333 | Reports | Weekly PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0334 | Reports | View Sales | Admin | Open | Renders |  |
| ADM-0335 | Reports | Sales CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0336 | Reports | Sales Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0337 | Reports | Sales PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0338 | Reports | View Revenue | Admin | Open | Renders |  |
| ADM-0339 | Reports | Revenue CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0340 | Reports | Revenue Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0341 | Reports | Revenue PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0342 | Reports | View Orders | Admin | Open | Renders |  |
| ADM-0343 | Reports | Orders CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0344 | Reports | Orders Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0345 | Reports | Orders PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0346 | Reports | View Customers | Admin | Open | Renders |  |
| ADM-0347 | Reports | Customers CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0348 | Reports | Customers Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0349 | Reports | Customers PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0350 | Reports | View Products | Admin | Open | Renders |  |
| ADM-0351 | Reports | Products CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0352 | Reports | Products Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0353 | Reports | Products PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0354 | Reports | View Inventory | Admin | Open | Renders |  |
| ADM-0355 | Reports | Inventory CSV | Admin | Export CSV | Download or clean disable |  |
| ADM-0356 | Reports | Inventory Excel | Admin | Export Excel | Download or clean disable |  |
| ADM-0357 | Reports | Inventory PDF | Admin | Export PDF | Download or clean disable |  |
| ADM-0358 | Notifications | List | Open | Items | OK |  |
| ADM-0359 | Notifications | Mark read | Mark | Read | OK |  |
| ADM-0360 | Notifications | Mark all | Mark all | All read | OK |  |
| ADM-0361 | Roles | List | Admin | Open | Visible |  |
| ADM-0362 | Roles | Search hit | Admin | Known | Filters |  |
| ADM-0363 | Roles | Search miss | Admin | zzzqa | Empty |  |
| ADM-0364 | Roles | Clear search | Admin | Clear | Full list |  |
| ADM-0365 | Roles | Add role open | Admin | Click Add role | Form |  |
| ADM-0366 | Roles | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0367 | Roles | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0368 | Roles | Edit open | Admin | Edit | Prefill |  |
| ADM-0369 | Roles | Edit save | Admin | Change save | Persists |  |
| ADM-0370 | Roles | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0371 | Roles | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0372 | Roles | Pagination | Admin | If many | Works |  |
| ADM-0373 | Roles | Status filter | Admin | If present | Filters |  |
| ADM-0374 | Roles | Permission matrix | Toggle Save | Limited admin respects | OK |  |
| ADM-0375 | Admins | List | Admin | Open | Visible |  |
| ADM-0376 | Admins | Search hit | Admin | Known | Filters |  |
| ADM-0377 | Admins | Search miss | Admin | zzzqa | Empty |  |
| ADM-0378 | Admins | Clear search | Admin | Clear | Full list |  |
| ADM-0379 | Admins | Add admin open | Admin | Click Add admin | Form |  |
| ADM-0380 | Admins | Create empty validation | Admin | Submit empty | Errors |  |
| ADM-0381 | Admins | Create success | Admin | Valid unique | Saved Network |  |
| ADM-0382 | Admins | Edit open | Admin | Edit | Prefill |  |
| ADM-0383 | Admins | Edit save | Admin | Change save | Persists |  |
| ADM-0384 | Admins | Delete cancel | Admin | Cancel | Remains |  |
| ADM-0385 | Admins | Delete confirm | Admin | Confirm | Removed |  |
| ADM-0386 | Admins | Pagination | Admin | If many | Works |  |
| ADM-0387 | Admins | Status filter | Admin | If present | Filters |  |
| ADM-0388 | Admins | Limited login | Restricted role login | Only allowed modules | OK |  |
| ADM-0389 | Admins | Inactive login | Inactive | Rejected | OK |  |
| ADM-0390 | Settings | Store email | Settings | Edit Store email Save | Persists |  |
| ADM-0391 | Settings | Shipping standard | Settings | Edit Shipping standard Save | Persists |  |
| ADM-0392 | Settings | Shipping express | Settings | Edit Shipping express Save | Persists |  |
| ADM-0393 | Settings | Free shipping threshold | Settings | Edit Free shipping threshold Save | Persists |  |
| ADM-0394 | Settings | Tax rate | Settings | Edit Tax rate Save | Persists |  |
| ADM-0395 | Settings | SEO fields | Settings | Edit SEO fields Save | Persists |  |
| ADM-0396 | Settings | Social URLs | Settings | Edit Social URLs Save | Persists |  |
| ADM-0397 | Settings | Save settings | Save settings | Success | Network |  |
| ADM-0398 | Profile | Change password | Valid new | Re-login | OK |  |
| ADM-0399 | Branding quirk | Sidebar logo letter | Inspect | Note if still shows A vs S | Document; fix if required for launch |  |
