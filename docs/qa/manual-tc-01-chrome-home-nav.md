# Part 1 - Scosha chrome, home, navigation, footer

Environment: storefront `http://localhost:3000`  -  admin `http://localhost:3000/admin`  -  API `http://localhost:5000/api/v1`

Mark Status: PASS / FAIL / BLOCKED / NOT RUN

| ID | Area | Case | Preconditions | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CH-0001 | Smoke | Storefront loads | Apps running | Open http://localhost:3000 | SCOSHA home; no crash |  |
| CH-0002 | Smoke | API health | API up | Open http://localhost:5000/api/docs or health | Reachable |  |
| CH-0003 | Smoke | Admin login reachable | Apps up | Open http://localhost:3000/admin/login | Admin login form |  |
| CH-0004 | Header | Logo home | Storefront | Click SCOSHA logo | Goes to / |  |
| CH-0005 | Header | Search toggle | Storefront | Click Search | Predictive search opens |  |
| CH-0006 | Header | Wishlist icon | Storefront | Click Wishlist | /wishlist |  |
| CH-0007 | Header | Account / Sign in | Storefront | Click Account | /account |  |
| CH-0008 | Header | Open bag | Storefront | Click bag | Cart drawer opens |  |
| CH-0009 | Header | AI Scan header | Storefront | Click AI | AI assistant opens |  |
| CH-0010 | Header | Open menu mobile | Storefront | 375px Open menu | Drawer opens |  |
| CH-0011 | Header | Single primary nav | Storefront | Desktop inspect | MAIN_NAV visible once; no duplicate row bug |  |
| CH-0012 | Top nav | Click Women | Desktop | Click Women | Correct /shop or coming-soon |  |
| CH-0013 | Top nav | Keyboard Women | Desktop | Tab Women; Enter | Navigates |  |
| CH-0014 | Top nav | Mega/sub Women | Desktop | Hover/expand Women | All / subcategories with counts if any |  |
| CH-0015 | Top nav | All Women | Mega open | Click All Women | Shop filtered for channel |  |
| CH-0016 | Top nav | Click Men | Desktop | Click Men | Correct /shop or coming-soon |  |
| CH-0017 | Top nav | Keyboard Men | Desktop | Tab Men; Enter | Navigates |  |
| CH-0018 | Top nav | Mega/sub Men | Desktop | Hover/expand Men | All / subcategories with counts if any |  |
| CH-0019 | Top nav | All Men | Mega open | Click All Men | Shop filtered for channel |  |
| CH-0020 | Top nav | Click Kids | Desktop | Click Kids | Correct /shop or coming-soon |  |
| CH-0021 | Top nav | Keyboard Kids | Desktop | Tab Kids; Enter | Navigates |  |
| CH-0022 | Top nav | Mega/sub Kids | Desktop | Hover/expand Kids | All / subcategories with counts if any |  |
| CH-0023 | Top nav | All Kids | Mega open | Click All Kids | Shop filtered for channel |  |
| CH-0024 | Top nav | Click Shoes | Desktop | Click Shoes | Correct /shop or coming-soon |  |
| CH-0025 | Top nav | Keyboard Shoes | Desktop | Tab Shoes; Enter | Navigates |  |
| CH-0026 | Top nav | Mega/sub Shoes | Desktop | Hover/expand Shoes | All / subcategories with counts if any |  |
| CH-0027 | Top nav | All Shoes | Mega open | Click All Shoes | Shop filtered for channel |  |
| CH-0028 | Top nav | Click Beauty | Desktop | Click Beauty | Correct /shop or coming-soon |  |
| CH-0029 | Top nav | Keyboard Beauty | Desktop | Tab Beauty; Enter | Navigates |  |
| CH-0030 | Top nav | Mega/sub Beauty | Desktop | Hover/expand Beauty | All / subcategories with counts if any |  |
| CH-0031 | Top nav | All Beauty | Mega open | Click All Beauty | Shop filtered for channel |  |
| CH-0032 | Top nav | Click Accessories | Desktop | Click Accessories | Correct /shop or coming-soon |  |
| CH-0033 | Top nav | Keyboard Accessories | Desktop | Tab Accessories; Enter | Navigates |  |
| CH-0034 | Top nav | Mega/sub Accessories | Desktop | Hover/expand Accessories | All / subcategories with counts if any |  |
| CH-0035 | Top nav | All Accessories | Mega open | Click All Accessories | Shop filtered for channel |  |
| CH-0036 | Top nav | Click Home | Desktop | Click Home | Correct /shop or coming-soon |  |
| CH-0037 | Top nav | Keyboard Home | Desktop | Tab Home; Enter | Navigates |  |
| CH-0038 | Top nav | Mega/sub Home | Desktop | Hover/expand Home | All / subcategories with counts if any |  |
| CH-0039 | Top nav | All Home | Mega open | Click All Home | Shop filtered for channel |  |
| CH-0040 | Nav destination | Women | Guest | Go /shop?category=clothes&subCategory=clothes-women | Page loads; filters/query applied |  |
| CH-0041 | Nav destination | Men | Guest | Go /shop?category=clothes&subCategory=clothes-men | Page loads; filters/query applied |  |
| CH-0042 | Nav destination | Kids | Guest | Go /shop?category=clothes&subCategory=clothes-kids | Page loads; filters/query applied |  |
| CH-0043 | Nav destination | Shoes | Guest | Go /shop?category=clothes&subCategory=clothes-shoes | Page loads; filters/query applied |  |
| CH-0044 | Nav destination | Beauty | Guest | Go /skincare | Page loads; filters/query applied |  |
| CH-0045 | Nav destination | Accessories | Guest | Go /shop?category=clothes&subCategory=bags | Page loads; filters/query applied |  |
| CH-0046 | Nav destination | Home | Guest | Go /shop?category=furniture | Page loads; filters/query applied |  |
| CH-0047 | Nav destination | Sale | Guest | Go /shop?discounted=true | Page loads; filters/query applied |  |
| CH-0048 | Nav destination | All shop | Guest | Go /shop | Page loads; filters/query applied |  |
| CH-0049 | Nav destination | Tech | Guest | Go /electronics | Page loads; filters/query applied |  |
| CH-0050 | Mega menu | Women > All Women | Desktop | Hover/expand Women; click All Women | Lands near /shop?category=clothes&subCategory=clothes-women; products, empty, or coming soon |  |
| CH-0051 | Mega menu | Women > New in | Desktop | Hover/expand Women; click New in | Lands near /shop?category=clothes&subCategory=clothes-women&sort=newest; products, empty, or coming soon |  |
| CH-0052 | Mega menu | Women > Sale | Desktop | Hover/expand Women; click Sale | Lands near /shop?category=clothes&subCategory=clothes-women&discounted=true; products, empty, or coming soon |  |
| CH-0053 | Mega menu | Men > All Men | Desktop | Hover/expand Men; click All Men | Lands near /shop?category=clothes&subCategory=clothes-men; products, empty, or coming soon |  |
| CH-0054 | Mega menu | Men > New in | Desktop | Hover/expand Men; click New in | Lands near /shop?category=clothes&subCategory=clothes-men&sort=newest; products, empty, or coming soon |  |
| CH-0055 | Mega menu | Men > Sale | Desktop | Hover/expand Men; click Sale | Lands near /shop?category=clothes&subCategory=clothes-men&discounted=true; products, empty, or coming soon |  |
| CH-0056 | Mega menu | Kids > All Kids | Desktop | Hover/expand Kids; click All Kids | Lands near /shop?category=clothes&subCategory=clothes-kids; products, empty, or coming soon |  |
| CH-0057 | Mega menu | Kids > Sale | Desktop | Hover/expand Kids; click Sale | Lands near /shop?category=clothes&subCategory=clothes-kids&discounted=true; products, empty, or coming soon |  |
| CH-0058 | Mega menu | Shoes > All Shoes | Desktop | Hover/expand Shoes; click All Shoes | Lands near /shop?category=clothes&subCategory=clothes-shoes; products, empty, or coming soon |  |
| CH-0059 | Mega menu | Shoes > Women shoes | Desktop | Hover/expand Shoes; click Women shoes | Lands near /shop?category=clothes&subCategory=clothes-women-shoes; products, empty, or coming soon |  |
| CH-0060 | Mega menu | Shoes > Men shoes | Desktop | Hover/expand Shoes; click Men shoes | Lands near /shop?category=clothes&subCategory=clothes-men-shoes; products, empty, or coming soon |  |
| CH-0061 | Mega menu | Shoes > Kids shoes | Desktop | Hover/expand Shoes; click Kids shoes | Lands near /shop?category=clothes&subCategory=clothes-kids-shoes; products, empty, or coming soon |  |
| CH-0062 | Mega menu | Accessories > Bags | Desktop | Hover/expand Accessories; click Bags | Lands near /shop?category=clothes&subCategory=bags; products, empty, or coming soon |  |
| CH-0063 | Mega menu | Accessories > Women bags | Desktop | Hover/expand Accessories; click Women bags | Lands near /shop?category=clothes&subCategory=clothes-women-bags; products, empty, or coming soon |  |
| CH-0064 | Mega menu | Accessories > Men bags | Desktop | Hover/expand Accessories; click Men bags | Lands near /shop?category=clothes&subCategory=clothes-men-bags; products, empty, or coming soon |  |
| CH-0065 | Mega menu | Home > All Home | Desktop | Hover/expand Home; click All Home | Lands near /shop?category=furniture; products, empty, or coming soon |  |
| CH-0066 | Mega menu | Home > Curtains | Desktop | Hover/expand Home; click Curtains | Lands near /shop?category=furniture&subCategory=furniture-curtains; products, empty, or coming soon |  |
| CH-0067 | Mega menu | Home > Pillow Covers | Desktop | Hover/expand Home; click Pillow Covers | Lands near /shop?category=furniture&subCategory=furniture-pillow-covers; products, empty, or coming soon |  |
| CH-0068 | Mega menu | Home > Bed Covers | Desktop | Hover/expand Home; click Bed Covers | Lands near /shop?category=furniture&subCategory=furniture-bed-covers; products, empty, or coming soon |  |
| CH-0069 | Mega menu | Home > Blankets | Desktop | Hover/expand Home; click Blankets | Lands near /shop?category=furniture&subCategory=furniture-blankets; products, empty, or coming soon |  |
| CH-0070 | Mega menu | Home > Mattress Toppers | Desktop | Hover/expand Home; click Mattress Toppers | Lands near /shop?category=furniture&subCategory=furniture-mattress-toppers; products, empty, or coming soon |  |
| CH-0071 | Mega menu | Beauty > Skincare soon | Desktop | Hover/expand Beauty; click Skincare soon | Lands near /skincare; products, empty, or coming soon |  |
| CH-0072 | Mega menu | Home > All products | Desktop | Hover/expand Home; click All products | Lands near /shop; products, empty, or coming soon |  |
| CH-0073 | Home extras | Announcement bar rotate | / | Wait for rotation | Messages cycle; layout stable |  |
| CH-0074 | Home extras | Sticky header | / | Scroll 200px | Header sticky and usable |  |
| CH-0075 | Home extras | Hero auto-rotate | / | Wait ~5s no hover | Advances if carousel |  |
| CH-0076 | Home extras | Hero pause hover | / | Hover 6s | Does not advance or pauses |  |
| CH-0077 | Home extras | Hero dots | / | Click each dot if present | Slide changes |  |
| CH-0078 | Home extras | Hero images | / | Inspect | No broken hero images |  |
| CH-0079 | Home extras | Newsletter empty | / | Subscribe empty | Validation |  |
| CH-0080 | Home extras | Newsletter invalid | / | bad@ | Validation |  |
| CH-0081 | Home extras | Newsletter valid | / | unique@qa.test Subscribe | Success; POST /newsletter/subscribe |  |
| CH-0082 | Mobile menu | Navigate Women | 375px menu | Tap Women | Navigates; closes |  |
| CH-0083 | Mobile menu | Expand Women | 375px menu | Chevron Women | Subs show |  |
| CH-0084 | Mobile menu | Navigate Men | 375px menu | Tap Men | Navigates; closes |  |
| CH-0085 | Mobile menu | Expand Men | 375px menu | Chevron Men | Subs show |  |
| CH-0086 | Mobile menu | Navigate Kids | 375px menu | Tap Kids | Navigates; closes |  |
| CH-0087 | Mobile menu | Expand Kids | 375px menu | Chevron Kids | Subs show |  |
| CH-0088 | Mobile menu | Navigate Shoes | 375px menu | Tap Shoes | Navigates; closes |  |
| CH-0089 | Mobile menu | Expand Shoes | 375px menu | Chevron Shoes | Subs show |  |
| CH-0090 | Mobile menu | Navigate Beauty | 375px menu | Tap Beauty | Navigates; closes |  |
| CH-0091 | Mobile menu | Expand Beauty | 375px menu | Chevron Beauty | Subs show |  |
| CH-0092 | Mobile menu | Navigate Accessories | 375px menu | Tap Accessories | Navigates; closes |  |
| CH-0093 | Mobile menu | Expand Accessories | 375px menu | Chevron Accessories | Subs show |  |
| CH-0094 | Mobile menu | Navigate Home | 375px menu | Tap Home | Navigates; closes |  |
| CH-0095 | Mobile menu | Expand Home | 375px menu | Chevron Home | Subs show |  |
| CH-0096 | Mobile menu | Sale link | 375px menu open | Tap Sale | /shop?discounted=true |  |
| CH-0097 | Mobile menu | AI Scan | 375px menu open | Tap AI Scan | AI opens |  |
| CH-0098 | Mobile menu | Contact Us | 375px menu open | Tap | /contact |  |
| CH-0099 | Mobile menu | Our Story | 375px menu open | Tap | /about |  |
| CH-0100 | Mobile menu | Wishlist | 375px menu open | Tap | /wishlist |  |
| CH-0101 | Mobile menu | Account | 375px menu open | Tap | /account |  |
| CH-0102 | Mobile menu | Close drawer | 375px menu open | Close | Closes |  |
| CH-0103 | Mobile menu | Search in drawer | 375px menu open | Type query; submit | Results or /shop?q= |  |
| CH-0104 | Bottom nav | Home | 375px | Tap Home | / |  |
| CH-0105 | Bottom nav | Shop | 375px | Tap Shop | /shop |  |
| CH-0106 | Bottom nav | Saved | 375px | Tap Saved | /wishlist |  |
| CH-0107 | Bottom nav | Account | 375px | Tap Account | /account |  |
| CH-0108 | Bottom nav | Bag | 375px | Tap Bag | Cart drawer |  |
| CH-0109 | Home | Hero CTAs | / | Click hero CTA(s) | Shop/collection |  |
| CH-0110 | Home | Category strip | / | Click each category | Correct shop filter |  |
| CH-0111 | Home | Product rails | / | Click product cards | PDP /product/[handle] |  |
| CH-0112 | Home | Trending section | / | Interact | Links work |  |
| CH-0113 | Home | AI size banner | / | Find My Size / Open AI | AI flow |  |
| CH-0114 | Home | Editorial/edits | / | Click edit cards | Shop filtered |  |
| CH-0115 | Cart drawer | Empty cart CTA | As needed | Empty bag; Shop Clothes | /shop clothes |  |
| CH-0116 | Cart drawer | Close drawer | As needed | Close | Closes |  |
| CH-0117 | Cart drawer | Line to PDP | As needed | Click line | PDP |  |
| CH-0118 | Cart drawer | Remove line | As needed | Remove | Gone; Network |  |
| CH-0119 | Cart drawer | Qty minus | As needed | - | Updates |  |
| CH-0120 | Cart drawer | Qty plus | As needed | + | Updates; stock cap |  |
| CH-0121 | Cart drawer | Free shipping progress | As needed | Inspect bar | Toward $150 |  |
| CH-0122 | Cart drawer | Subtotal | As needed | Inspect | Correct |  |
| CH-0123 | Cart drawer | Shipping $9 or FREE | As needed | Inspect | Rule correct |  |
| CH-0124 | Cart drawer | Proceed to Checkout guest | As needed | Guest | Login/account gate |  |
| CH-0125 | Cart drawer | Proceed to Checkout customer | As needed | Customer+items | /checkout |  |
| CH-0126 | Search | Open predictive | Storefront | Click Search | Panel |  |
| CH-0127 | Search | Type query | Storefront | jacket | Suggestions |  |
| CH-0128 | Search | Click result | Storefront | Click product | PDP |  |
| CH-0129 | Search | View all results | Storefront | View all | /shop?q= |  |
| CH-0130 | Search | Empty query | Storefront | Submit empty | Handled |  |
| CH-0131 | Search | Close | Storefront | Close/outside | Closes |  |
| CH-0132 | Footer Shop | Women | / | Click footer Women | Correct destination |  |
| CH-0133 | Footer Shop | Men | / | Click footer Men | Correct destination |  |
| CH-0134 | Footer Shop | Kids | / | Click footer Kids | Correct destination |  |
| CH-0135 | Footer Shop | Shoes | / | Click footer Shoes | Correct destination |  |
| CH-0136 | Footer Shop | Beauty | / | Click footer Beauty | Correct destination |  |
| CH-0137 | Footer Shop | Accessories | / | Click footer Accessories | Correct destination |  |
| CH-0138 | Footer Shop | Tech | / | Click footer Tech | Correct destination |  |
| CH-0139 | Footer Shop | Home | / | Click footer Home | Correct destination |  |
| CH-0140 | Footer Help | Track Order | / | Click Track Order | Correct page/shop |  |
| CH-0141 | Footer Help | Shipping | / | Click Shipping | Correct page/shop |  |
| CH-0142 | Footer Help | Returns & Exchanges | / | Click Returns & Exchanges | Correct page/shop |  |
| CH-0143 | Footer Help | Size Guide | / | Click Size Guide | Correct page/shop |  |
| CH-0144 | Footer Help | FAQ | / | Click FAQ | Correct page/shop |  |
| CH-0145 | Footer About | Terms | / | Click Terms | /policies/... |  |
| CH-0146 | Footer About | Privacy | / | Click Privacy | /policies/... |  |
| CH-0147 | Footer social | Instagram | / | Click Instagram | Opens target |  |
| CH-0148 | Footer social | Facebook | / | Click Facebook | Opens target |  |
| CH-0149 | Footer social | TikTok | / | Click TikTok | Opens target |  |
| CH-0150 | Footer social | Email us | / | Click Email us | Opens target |  |
| CH-0151 | Footer social | Whatsapp us | / | Click Whatsapp us | Opens target |  |
| CH-0152 | Footer/AI | VIP empty | / | Check empty | Toast/validation |  |
| CH-0153 | Footer/AI | VIP invalid email | / | bad@ | Validation |  |
| CH-0154 | Footer/AI | VIP non-member | / | unknown@test.com | Not VIP; no leak |  |
| CH-0155 | Footer/AI | VIP member | / | Known VIP | Confirmed + login CTA |  |
| CH-0156 | Footer/AI | Benefits strip | / | Inspect | Free delivery / authentic / returns |  |
| CH-0157 | Footer/AI | COD mark only | / | Inspect payment marks | Cash On Delivery only; no fake Apple Pay CTA that charges |  |
| CH-0158 | Footer/AI | Floating AI open | / | Click floating AI | Opens |  |
| CH-0159 | Footer/AI | Floating AI drag | / | Drag | Moves |  |
| CH-0160 | Footer/AI | Floating AI remove | / | Remove | Gone |  |
