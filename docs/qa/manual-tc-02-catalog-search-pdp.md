# Part 2 - Scosha shop, filters, PDP, compare, coming soon

| ID | Area | Case | Preconditions | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CAT-0001 | Shop | Open /shop | Guest | Open /shop | Catalog loads |  |
| CAT-0002 | Department tabs | Clothes (Winter) | /shop | Click Clothes (Winter) | Filter or coming-soon |  |
| CAT-0003 | Department tabs | Home (Living) | /shop | Click Home (Living) | Filter or coming-soon |  |
| CAT-0004 | Department tabs | Skincare (Soon) | /shop | Click Skincare (Soon) | Filter or coming-soon |  |
| CAT-0005 | Department tabs | Electronics (Soon) | /shop | Click Electronics (Soon) | Filter or coming-soon |  |
| CAT-0006 | Shop URL | Women | Guest | Open /shop?category=clothes&subCategory=clothes-women | Correct products or soon page |  |
| CAT-0007 | Shop URL | Women refresh | On page | F5 | Stable |  |
| CAT-0008 | Shop URL | Women console | On page | Console | No app errors |  |
| CAT-0009 | Shop URL | Women mobile | 375px | Open /shop?category=clothes&subCategory=clothes-women | No overflow |  |
| CAT-0010 | Shop URL | Men | Guest | Open /shop?category=clothes&subCategory=clothes-men | Correct products or soon page |  |
| CAT-0011 | Shop URL | Men refresh | On page | F5 | Stable |  |
| CAT-0012 | Shop URL | Men console | On page | Console | No app errors |  |
| CAT-0013 | Shop URL | Men mobile | 375px | Open /shop?category=clothes&subCategory=clothes-men | No overflow |  |
| CAT-0014 | Shop URL | Kids | Guest | Open /shop?category=clothes&subCategory=clothes-kids | Correct products or soon page |  |
| CAT-0015 | Shop URL | Kids refresh | On page | F5 | Stable |  |
| CAT-0016 | Shop URL | Kids console | On page | Console | No app errors |  |
| CAT-0017 | Shop URL | Kids mobile | 375px | Open /shop?category=clothes&subCategory=clothes-kids | No overflow |  |
| CAT-0018 | Shop URL | Shoes | Guest | Open /shop?category=clothes&subCategory=clothes-shoes | Correct products or soon page |  |
| CAT-0019 | Shop URL | Shoes refresh | On page | F5 | Stable |  |
| CAT-0020 | Shop URL | Shoes console | On page | Console | No app errors |  |
| CAT-0021 | Shop URL | Shoes mobile | 375px | Open /shop?category=clothes&subCategory=clothes-shoes | No overflow |  |
| CAT-0022 | Shop URL | Beauty | Guest | Open /skincare | Correct products or soon page |  |
| CAT-0023 | Shop URL | Beauty refresh | On page | F5 | Stable |  |
| CAT-0024 | Shop URL | Beauty console | On page | Console | No app errors |  |
| CAT-0025 | Shop URL | Beauty mobile | 375px | Open /skincare | No overflow |  |
| CAT-0026 | Shop URL | Accessories | Guest | Open /shop?category=clothes&subCategory=bags | Correct products or soon page |  |
| CAT-0027 | Shop URL | Accessories refresh | On page | F5 | Stable |  |
| CAT-0028 | Shop URL | Accessories console | On page | Console | No app errors |  |
| CAT-0029 | Shop URL | Accessories mobile | 375px | Open /shop?category=clothes&subCategory=bags | No overflow |  |
| CAT-0030 | Shop URL | Home | Guest | Open /shop?category=furniture | Correct products or soon page |  |
| CAT-0031 | Shop URL | Home refresh | On page | F5 | Stable |  |
| CAT-0032 | Shop URL | Home console | On page | Console | No app errors |  |
| CAT-0033 | Shop URL | Home mobile | 375px | Open /shop?category=furniture | No overflow |  |
| CAT-0034 | Shop URL | Sale | Guest | Open /shop?discounted=true | Correct products or soon page |  |
| CAT-0035 | Shop URL | Sale refresh | On page | F5 | Stable |  |
| CAT-0036 | Shop URL | Sale console | On page | Console | No app errors |  |
| CAT-0037 | Shop URL | Sale mobile | 375px | Open /shop?discounted=true | No overflow |  |
| CAT-0038 | Shop URL | All shop | Guest | Open /shop | Correct products or soon page |  |
| CAT-0039 | Shop URL | All shop refresh | On page | F5 | Stable |  |
| CAT-0040 | Shop URL | All shop console | On page | Console | No app errors |  |
| CAT-0041 | Shop URL | All shop mobile | 375px | Open /shop | No overflow |  |
| CAT-0042 | Shop URL | Tech | Guest | Open /electronics | Correct products or soon page |  |
| CAT-0043 | Shop URL | Tech refresh | On page | F5 | Stable |  |
| CAT-0044 | Shop URL | Tech console | On page | Console | No app errors |  |
| CAT-0045 | Shop URL | Tech mobile | 375px | Open /electronics | No overflow |  |
| CAT-0046 | Deep shop | Women/All Women | Guest | Open /shop?category=clothes&subCategory=clothes-women | Correct filter or soon; no crash |  |
| CAT-0047 | Deep shop | Women/All Women empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-women; Reset All | Stable |  |
| CAT-0048 | Deep shop | Women/All Women mobile | 375px | Open /shop?category=clothes&subCategory=clothes-women | No overflow |  |
| CAT-0049 | Deep shop | Women/New in | Guest | Open /shop?category=clothes&subCategory=clothes-women&sort=newest | Correct filter or soon; no crash |  |
| CAT-0050 | Deep shop | Women/New in empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-women&sort=newest; Reset All | Stable |  |
| CAT-0051 | Deep shop | Women/New in mobile | 375px | Open /shop?category=clothes&subCategory=clothes-women&sort=newest | No overflow |  |
| CAT-0052 | Deep shop | Women/Sale | Guest | Open /shop?category=clothes&subCategory=clothes-women&discounted=true | Correct filter or soon; no crash |  |
| CAT-0053 | Deep shop | Women/Sale empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-women&discounted=true; Reset All | Stable |  |
| CAT-0054 | Deep shop | Women/Sale mobile | 375px | Open /shop?category=clothes&subCategory=clothes-women&discounted=true | No overflow |  |
| CAT-0055 | Deep shop | Men/All Men | Guest | Open /shop?category=clothes&subCategory=clothes-men | Correct filter or soon; no crash |  |
| CAT-0056 | Deep shop | Men/All Men empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-men; Reset All | Stable |  |
| CAT-0057 | Deep shop | Men/All Men mobile | 375px | Open /shop?category=clothes&subCategory=clothes-men | No overflow |  |
| CAT-0058 | Deep shop | Men/New in | Guest | Open /shop?category=clothes&subCategory=clothes-men&sort=newest | Correct filter or soon; no crash |  |
| CAT-0059 | Deep shop | Men/New in empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-men&sort=newest; Reset All | Stable |  |
| CAT-0060 | Deep shop | Men/New in mobile | 375px | Open /shop?category=clothes&subCategory=clothes-men&sort=newest | No overflow |  |
| CAT-0061 | Deep shop | Men/Sale | Guest | Open /shop?category=clothes&subCategory=clothes-men&discounted=true | Correct filter or soon; no crash |  |
| CAT-0062 | Deep shop | Men/Sale empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-men&discounted=true; Reset All | Stable |  |
| CAT-0063 | Deep shop | Men/Sale mobile | 375px | Open /shop?category=clothes&subCategory=clothes-men&discounted=true | No overflow |  |
| CAT-0064 | Deep shop | Kids/All Kids | Guest | Open /shop?category=clothes&subCategory=clothes-kids | Correct filter or soon; no crash |  |
| CAT-0065 | Deep shop | Kids/All Kids empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-kids; Reset All | Stable |  |
| CAT-0066 | Deep shop | Kids/All Kids mobile | 375px | Open /shop?category=clothes&subCategory=clothes-kids | No overflow |  |
| CAT-0067 | Deep shop | Kids/Sale | Guest | Open /shop?category=clothes&subCategory=clothes-kids&discounted=true | Correct filter or soon; no crash |  |
| CAT-0068 | Deep shop | Kids/Sale empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-kids&discounted=true; Reset All | Stable |  |
| CAT-0069 | Deep shop | Kids/Sale mobile | 375px | Open /shop?category=clothes&subCategory=clothes-kids&discounted=true | No overflow |  |
| CAT-0070 | Deep shop | Shoes/All Shoes | Guest | Open /shop?category=clothes&subCategory=clothes-shoes | Correct filter or soon; no crash |  |
| CAT-0071 | Deep shop | Shoes/All Shoes empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-shoes; Reset All | Stable |  |
| CAT-0072 | Deep shop | Shoes/All Shoes mobile | 375px | Open /shop?category=clothes&subCategory=clothes-shoes | No overflow |  |
| CAT-0073 | Deep shop | Shoes/Women shoes | Guest | Open /shop?category=clothes&subCategory=clothes-women-shoes | Correct filter or soon; no crash |  |
| CAT-0074 | Deep shop | Shoes/Women shoes empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-women-shoes; Reset All | Stable |  |
| CAT-0075 | Deep shop | Shoes/Women shoes mobile | 375px | Open /shop?category=clothes&subCategory=clothes-women-shoes | No overflow |  |
| CAT-0076 | Deep shop | Shoes/Men shoes | Guest | Open /shop?category=clothes&subCategory=clothes-men-shoes | Correct filter or soon; no crash |  |
| CAT-0077 | Deep shop | Shoes/Men shoes empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-men-shoes; Reset All | Stable |  |
| CAT-0078 | Deep shop | Shoes/Men shoes mobile | 375px | Open /shop?category=clothes&subCategory=clothes-men-shoes | No overflow |  |
| CAT-0079 | Deep shop | Shoes/Kids shoes | Guest | Open /shop?category=clothes&subCategory=clothes-kids-shoes | Correct filter or soon; no crash |  |
| CAT-0080 | Deep shop | Shoes/Kids shoes empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-kids-shoes; Reset All | Stable |  |
| CAT-0081 | Deep shop | Shoes/Kids shoes mobile | 375px | Open /shop?category=clothes&subCategory=clothes-kids-shoes | No overflow |  |
| CAT-0082 | Deep shop | Accessories/Bags | Guest | Open /shop?category=clothes&subCategory=bags | Correct filter or soon; no crash |  |
| CAT-0083 | Deep shop | Accessories/Bags empty facets | Guest | Open /shop?category=clothes&subCategory=bags; Reset All | Stable |  |
| CAT-0084 | Deep shop | Accessories/Bags mobile | 375px | Open /shop?category=clothes&subCategory=bags | No overflow |  |
| CAT-0085 | Deep shop | Accessories/Women bags | Guest | Open /shop?category=clothes&subCategory=clothes-women-bags | Correct filter or soon; no crash |  |
| CAT-0086 | Deep shop | Accessories/Women bags empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-women-bags; Reset All | Stable |  |
| CAT-0087 | Deep shop | Accessories/Women bags mobile | 375px | Open /shop?category=clothes&subCategory=clothes-women-bags | No overflow |  |
| CAT-0088 | Deep shop | Accessories/Men bags | Guest | Open /shop?category=clothes&subCategory=clothes-men-bags | Correct filter or soon; no crash |  |
| CAT-0089 | Deep shop | Accessories/Men bags empty facets | Guest | Open /shop?category=clothes&subCategory=clothes-men-bags; Reset All | Stable |  |
| CAT-0090 | Deep shop | Accessories/Men bags mobile | 375px | Open /shop?category=clothes&subCategory=clothes-men-bags | No overflow |  |
| CAT-0091 | Deep shop | Home/All Home | Guest | Open /shop?category=furniture | Correct filter or soon; no crash |  |
| CAT-0092 | Deep shop | Home/All Home empty facets | Guest | Open /shop?category=furniture; Reset All | Stable |  |
| CAT-0093 | Deep shop | Home/All Home mobile | 375px | Open /shop?category=furniture | No overflow |  |
| CAT-0094 | Deep shop | Home/Curtains | Guest | Open /shop?category=furniture&subCategory=furniture-curtains | Correct filter or soon; no crash |  |
| CAT-0095 | Deep shop | Home/Curtains empty facets | Guest | Open /shop?category=furniture&subCategory=furniture-curtains; Reset All | Stable |  |
| CAT-0096 | Deep shop | Home/Curtains mobile | 375px | Open /shop?category=furniture&subCategory=furniture-curtains | No overflow |  |
| CAT-0097 | Deep shop | Home/Pillow Covers | Guest | Open /shop?category=furniture&subCategory=furniture-pillow-covers | Correct filter or soon; no crash |  |
| CAT-0098 | Deep shop | Home/Pillow Covers empty facets | Guest | Open /shop?category=furniture&subCategory=furniture-pillow-covers; Reset All | Stable |  |
| CAT-0099 | Deep shop | Home/Pillow Covers mobile | 375px | Open /shop?category=furniture&subCategory=furniture-pillow-covers | No overflow |  |
| CAT-0100 | Deep shop | Home/Bed Covers | Guest | Open /shop?category=furniture&subCategory=furniture-bed-covers | Correct filter or soon; no crash |  |
| CAT-0101 | Deep shop | Home/Bed Covers empty facets | Guest | Open /shop?category=furniture&subCategory=furniture-bed-covers; Reset All | Stable |  |
| CAT-0102 | Deep shop | Home/Bed Covers mobile | 375px | Open /shop?category=furniture&subCategory=furniture-bed-covers | No overflow |  |
| CAT-0103 | Deep shop | Home/Blankets | Guest | Open /shop?category=furniture&subCategory=furniture-blankets | Correct filter or soon; no crash |  |
| CAT-0104 | Deep shop | Home/Blankets empty facets | Guest | Open /shop?category=furniture&subCategory=furniture-blankets; Reset All | Stable |  |
| CAT-0105 | Deep shop | Home/Blankets mobile | 375px | Open /shop?category=furniture&subCategory=furniture-blankets | No overflow |  |
| CAT-0106 | Deep shop | Home/Mattress Toppers | Guest | Open /shop?category=furniture&subCategory=furniture-mattress-toppers | Correct filter or soon; no crash |  |
| CAT-0107 | Deep shop | Home/Mattress Toppers empty facets | Guest | Open /shop?category=furniture&subCategory=furniture-mattress-toppers; Reset All | Stable |  |
| CAT-0108 | Deep shop | Home/Mattress Toppers mobile | 375px | Open /shop?category=furniture&subCategory=furniture-mattress-toppers | No overflow |  |
| CAT-0109 | Deep shop | Beauty/Skincare soon | Guest | Open /skincare | Correct filter or soon; no crash |  |
| CAT-0110 | Deep shop | Beauty/Skincare soon empty facets | Guest | Open /skincare; Reset All | Stable |  |
| CAT-0111 | Deep shop | Beauty/Skincare soon mobile | 375px | Open /skincare | No overflow |  |
| CAT-0112 | Deep shop | Home/All products | Guest | Open /shop | Correct filter or soon; no crash |  |
| CAT-0113 | Deep shop | Home/All products empty facets | Guest | Open /shop; Reset All | Stable |  |
| CAT-0114 | Deep shop | Home/All products mobile | 375px | Open /shop | No overflow |  |
| CAT-0115 | Pagination | Page 1 | /shop with many | Go page 1 if present | Products change; URL/query OK |  |
| CAT-0116 | Pagination | Page 2 | /shop with many | Go page 2 if present | Products change; URL/query OK |  |
| CAT-0117 | Pagination | Page 3 | /shop with many | Go page 3 if present | Products change; URL/query OK |  |
| CAT-0118 | Pagination | Next/Prev | Page 2+ | Next then Prev | Correct pages |  |
| CAT-0119 | Empty catalog | No results facets | /shop | Apply impossible filter combo | Empty state + clear path |  |
| CAT-0120 | Sort | Featured | /shop with products | Select Featured | Order changes |  |
| CAT-0121 | Sort | Newest Arrivals | /shop with products | Select Newest Arrivals | Order changes |  |
| CAT-0122 | Sort | Best Selling | /shop with products | Select Best Selling | Order changes |  |
| CAT-0123 | Sort | A-Z | /shop with products | Select A-Z | Order changes |  |
| CAT-0124 | Sort | Z-A | /shop with products | Select Z-A | Order changes |  |
| CAT-0125 | Sort | Price low to high | /shop with products | Select Price low to high | Order changes |  |
| CAT-0126 | Sort | Price high to low | /shop with products | Select Price high to low | Order changes |  |
| CAT-0127 | Sort | Customer Rating | /shop with products | Select Customer Rating | Order changes |  |
| CAT-0128 | Filter | Apply Department | Facets | Use Department | Results update |  |
| CAT-0129 | Filter | Clear chip Department | Active | Remove chip | Restored |  |
| CAT-0130 | Filter | Apply Shop by | Facets | Use Shop by | Results update |  |
| CAT-0131 | Filter | Clear chip Shop by | Active | Remove chip | Restored |  |
| CAT-0132 | Filter | Apply Product Type | Facets | Use Product Type | Results update |  |
| CAT-0133 | Filter | Clear chip Product Type | Active | Remove chip | Restored |  |
| CAT-0134 | Filter | Apply Size | Facets | Use Size | Results update |  |
| CAT-0135 | Filter | Clear chip Size | Active | Remove chip | Restored |  |
| CAT-0136 | Filter | Apply Color | Facets | Use Color | Results update |  |
| CAT-0137 | Filter | Clear chip Color | Active | Remove chip | Restored |  |
| CAT-0138 | Filter | Apply Brands | Facets | Use Brands | Results update |  |
| CAT-0139 | Filter | Clear chip Brands | Active | Remove chip | Restored |  |
| CAT-0140 | Filter | Apply Price Min | Facets | Use Price Min | Results update |  |
| CAT-0141 | Filter | Clear chip Price Min | Active | Remove chip | Restored |  |
| CAT-0142 | Filter | Apply Price Max | Facets | Use Price Max | Results update |  |
| CAT-0143 | Filter | Clear chip Price Max | Active | Remove chip | Restored |  |
| CAT-0144 | Filter | Apply On Sale / Discounted | Facets | Use On Sale / Discounted | Results update |  |
| CAT-0145 | Filter | Clear chip On Sale / Discounted | Active | Remove chip | Restored |  |
| CAT-0146 | Filter | Apply In Stock Only | Facets | Use In Stock Only | Results update |  |
| CAT-0147 | Filter | Clear chip In Stock Only | Active | Remove chip | Restored |  |
| CAT-0148 | Filter | Apply Gender if present | Facets | Use Gender if present | Results update |  |
| CAT-0149 | Filter | Clear chip Gender if present | Active | Remove chip | Restored |  |
| CAT-0150 | Filter | Clear all / Reset All | Multiple | Reset | All clear |  |
| CAT-0151 | Filter | Mobile Filters drawer | 375px | Open Filters; apply; close | Works |  |
| CAT-0152 | Filter | Show|Hide Filters desktop | Desktop | Toggle | Panel toggles |  |
| CAT-0153 | Filter | Combine size+inStock+sale | Facets | Apply 3 | Intersection |  |
| CAT-0154 | Compare | Enable compare | /shop | Toggle compare | Checkboxes appear |  |
| CAT-0155 | Compare | Select 1 item | /shop | Check product | Bar shows 1 |  |
| CAT-0156 | Compare | Select 4 items | /shop | Check 4 | Max 4 |  |
| CAT-0157 | Compare | Select 5th blocked | /shop | Try 5th | Blocked/message |  |
| CAT-0158 | Compare | Compare modal | /shop | Compare | Side-by-side |  |
| CAT-0159 | Compare | Remove from bar | /shop | Remove item | Updates |  |
| CAT-0160 | Compare | Clear compare | /shop | Clear | Reset |  |
| CAT-0161 | Compare | Close modal | /shop | Close | Closes |  |
| CAT-0162 | Compare | Link to PDP from compare | /shop | Click product | PDP |  |
| CAT-0163 | ProductCard | Open PDP | /shop | Click card | /product/handle |  |
| CAT-0164 | ProductCard | Wishlist | /shop | Heart | Toggles |  |
| CAT-0165 | ProductCard | Quick view | /shop | Quick view | Modal |  |
| CAT-0166 | ProductCard | QV close | /shop | Close | Closes |  |
| CAT-0167 | ProductCard | QV add | /shop | In-stock Add | Cart Network |  |
| CAT-0168 | ProductCard | QV OOS | /shop | OOS | Disabled |  |
| CAT-0169 | ProductCard | Color swatch | /shop | Click color | Updates |  |
| CAT-0170 | ProductCard | Add from card | /shop | Add | Adds or opens |  |
| CAT-0171 | ProductCard | Compare checkbox | /shop | Check | Selected |  |
| CAT-0172 | PDP | In-stock PDP | Real product handle | Open sco- product | Gallery price sizes Add |  |
| CAT-0173 | PDP | OOS PDP | Real product handle | OOS product | Add disabled |  |
| CAT-0174 | PDP | Legacy ama redirect | Real product handle | Old -ama- URL if any | Redirects to -sco- |  |
| CAT-0175 | PDP | Legacy pup redirect | Real product handle | Old -pup- URL if any | Redirects to -sco- |  |
| CAT-0176 | PDP | Invalid handle | Real product handle | /product/nope-qa-999 | Not found |  |
| CAT-0177 | PDP | Breadcrumb | Real product handle | Click crumbs | Navigate |  |
| CAT-0178 | PDP | Gallery thumbs | Real product handle | Click thumbs | Image changes |  |
| CAT-0179 | PDP | Color | Real product handle | Select color | Updates |  |
| CAT-0180 | PDP | Size in-stock | Real product handle | Select size | Add enabled |  |
| CAT-0181 | PDP | Size OOS | Real product handle | OOS size | Disabled |  |
| CAT-0182 | PDP | Size guide open | Real product handle | Size guide | Modal |  |
| CAT-0183 | PDP | Size guide close | Real product handle | Close | Closes |  |
| CAT-0184 | PDP | Qty - at 1 | Real product handle | Qty 1 | Disabled |  |
| CAT-0185 | PDP | Qty + | Real product handle | Inc | Up; cap |  |
| CAT-0186 | PDP | Add to Bag | Real product handle | Add | Toast; bag; POST cart |  |
| CAT-0187 | PDP | Wishlist | Real product handle | Heart | Toggles |  |
| CAT-0188 | PDP | WhatsApp contact | Real product handle | WhatsApp | wa.me |  |
| CAT-0189 | PDP | Sticky mobile add | Real product handle | 375px scroll | Sticky add works |  |
| CAT-0190 | PDP | Shipping accordion | Real product handle | Toggle | Content |  |
| CAT-0191 | PDP | Refresh | Real product handle | F5 | Same product |  |
| CAT-0192 | PDP | Console | Real product handle | Check | No errors |  |
| CAT-0193 | PDP | Network GET product | Real product handle | Network | 200 |  |
| CAT-0194 | Coming soon | Load /skincare | Guest | Open /skincare | Coming soon + waitlist |  |
| CAT-0195 | Coming soon | Waitlist /skincare | Guest | Submit waitlist email if present | Success/validation |  |
| CAT-0196 | Coming soon | CTAs /skincare | Guest | Click CTAs | Navigate or subscribe |  |
| CAT-0197 | Coming soon | Load /electronics | Guest | Open /electronics | Coming soon + waitlist |  |
| CAT-0198 | Coming soon | Waitlist /electronics | Guest | Submit waitlist email if present | Success/validation |  |
| CAT-0199 | Coming soon | CTAs /electronics | Guest | Click CTAs | Navigate or subscribe |  |
| CAT-0200 | CMS page | /about | Guest | Open /about | Content renders |  |
| CAT-0201 | CMS page | /loyalty | Guest | Open /loyalty | Content renders |  |
| CAT-0202 | CMS page | /gifts | Guest | Open /gifts | Content renders |  |
| CAT-0203 | CMS page | /giveaways | Guest | Open /giveaways | Content renders |  |
| CAT-0204 | Gifts | Sale CTA | /gifts | Click sale/shop link | /shop discounted or shop |  |
| CAT-0205 | Policies | /policies/privacy | Guest | Open /policies/privacy | Readable policy |  |
| CAT-0206 | Policies | /policies/returns | Guest | Open /policies/returns | Readable policy |  |
| CAT-0207 | Policies | /policies/shipping | Guest | Open /policies/shipping | Readable policy |  |
| CAT-0208 | Policies | /policies/terms | Guest | Open /policies/terms | Readable policy |  |
