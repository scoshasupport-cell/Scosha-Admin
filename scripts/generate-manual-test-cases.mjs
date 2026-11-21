/**
 * Generate exhaustive manual browser QA cases for Scosha.
 * Run from repo root: node scripts/generate-manual-test-cases.mjs
 */
import fs from "fs";
import path from "path";

const outDir = path.join("docs", "qa");
fs.mkdirSync(outDir, { recursive: true });

function row(id, area, title, pre, steps, expected) {
  return `| ${id} | ${area} | ${title} | ${pre} | ${steps} | ${expected} |  |`;
}

const header = `| ID | Area | Case | Preconditions | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |`;

const files = {};
function add(file, lines) {
  files[file] = lines;
}

let n = 0;
function id(prefix) {
  n += 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}
function reset() {
  n = 0;
}

const ENV = {
  store: "http://localhost:3000",
  admin: "http://localhost:3000/admin",
  api: "http://localhost:5000/api/v1",
};

const topNav = ["Women", "Men", "Kids", "Shoes", "Beauty", "Accessories", "Home"];

const shopLinks = [
  ["Women", "/shop?category=clothes&subCategory=clothes-women"],
  ["Men", "/shop?category=clothes&subCategory=clothes-men"],
  ["Kids", "/shop?category=clothes&subCategory=clothes-kids"],
  ["Shoes", "/shop?category=clothes&subCategory=clothes-shoes"],
  ["Beauty", "/skincare"],
  ["Accessories", "/shop?category=clothes&subCategory=bags"],
  ["Home", "/shop?category=furniture"],
  ["Sale", "/shop?discounted=true"],
  ["All shop", "/shop"],
  ["Tech", "/electronics"],
];

const megaLinks = [
  ["Women", "All Women", "/shop?category=clothes&subCategory=clothes-women"],
  ["Women", "New in", "/shop?category=clothes&subCategory=clothes-women&sort=newest"],
  ["Women", "Sale", "/shop?category=clothes&subCategory=clothes-women&discounted=true"],
  ["Men", "All Men", "/shop?category=clothes&subCategory=clothes-men"],
  ["Men", "New in", "/shop?category=clothes&subCategory=clothes-men&sort=newest"],
  ["Men", "Sale", "/shop?category=clothes&subCategory=clothes-men&discounted=true"],
  ["Kids", "All Kids", "/shop?category=clothes&subCategory=clothes-kids"],
  ["Kids", "Sale", "/shop?category=clothes&subCategory=clothes-kids&discounted=true"],
  ["Shoes", "All Shoes", "/shop?category=clothes&subCategory=clothes-shoes"],
  ["Shoes", "Women shoes", "/shop?category=clothes&subCategory=clothes-women-shoes"],
  ["Shoes", "Men shoes", "/shop?category=clothes&subCategory=clothes-men-shoes"],
  ["Shoes", "Kids shoes", "/shop?category=clothes&subCategory=clothes-kids-shoes"],
  ["Accessories", "Bags", "/shop?category=clothes&subCategory=bags"],
  ["Accessories", "Women bags", "/shop?category=clothes&subCategory=clothes-women-bags"],
  ["Accessories", "Men bags", "/shop?category=clothes&subCategory=clothes-men-bags"],
  ["Home", "All Home", "/shop?category=furniture"],
  ["Home", "Curtains", "/shop?category=furniture&subCategory=furniture-curtains"],
  ["Home", "Pillow Covers", "/shop?category=furniture&subCategory=furniture-pillow-covers"],
  ["Home", "Bed Covers", "/shop?category=furniture&subCategory=furniture-bed-covers"],
  ["Home", "Blankets", "/shop?category=furniture&subCategory=furniture-blankets"],
  ["Home", "Mattress Toppers", "/shop?category=furniture&subCategory=furniture-mattress-toppers"],
  ["Beauty", "Skincare soon", "/skincare"],
  ["Home", "All products", "/shop"],
];

const deepShopUrls = [
  ...shopLinks.map(([, href]) => href),
  ...megaLinks.map(([, , href]) => href),
  "/shop?q=jacket",
  "/shop?q=curtain",
  "/shop?inStock=true",
  "/shop?discounted=true&sort=price-asc",
  "/shop?category=clothes",
  "/shop?category=furniture&inStock=true",
];

const sorts = [
  "Featured",
  "Newest Arrivals",
  "Best Selling",
  "A-Z",
  "Z-A",
  "Price low to high",
  "Price high to low",
  "Customer Rating",
];

const adminNav = [
  "Dashboard", "Products", "Size Charts", "Categories", "Brands", "Collections", "Orders",
  "Customers", "VIP Customers", "Reviews", "Coupons", "Inventory", "Media", "Homepage",
  "Pages", "Blogs", "FAQs", "Contact", "Newsletter", "Reports", "Notifications", "Roles",
  "Admins", "Settings", "Profile",
];

// ========== PART 1 ==========
reset();
const chrome = [
  "# Part 1 - Scosha chrome, home, navigation, footer",
  "",
  `Environment: storefront \`${ENV.store}\`  -  admin \`${ENV.admin}\`  -  API \`${ENV.api}\``,
  "",
  "Mark Status: PASS / FAIL / BLOCKED / NOT RUN",
  "",
  header,
];

chrome.push(row(id("CH"), "Smoke", "Storefront loads", "Apps running", `Open ${ENV.store}`, "SCOSHA home; no crash"));
chrome.push(row(id("CH"), "Smoke", "API health", "API up", `Open ${ENV.api.replace("/api/v1", "")}/api/docs or health`, "Reachable"));
chrome.push(row(id("CH"), "Smoke", "Admin login reachable", "Apps up", `Open ${ENV.admin}/login`, "Admin login form"));

for (const [t, s, e] of [
  ["Logo home", "Click SCOSHA logo", "Goes to /"],
  ["Search toggle", "Click Search", "Predictive search opens"],
  ["Wishlist icon", "Click Wishlist", "/wishlist"],
  ["Account / Sign in", "Click Account", "/account"],
  ["Open bag", "Click bag", "Cart drawer opens"],
  ["AI Scan header", "Click AI", "AI assistant opens"],
  ["Open menu mobile", "375px Open menu", "Drawer opens"],
  ["Single primary nav", "Desktop inspect", "MAIN_NAV visible once; no duplicate row bug"],
]) {
  chrome.push(row(id("CH"), "Header", t, "Storefront", s, e));
}

for (const label of topNav) {
  chrome.push(row(id("CH"), "Top nav", `Click ${label}`, "Desktop", `Click ${label}`, "Correct /shop or coming-soon"));
  chrome.push(row(id("CH"), "Top nav", `Keyboard ${label}`, "Desktop", `Tab ${label}; Enter`, "Navigates"));
  chrome.push(row(id("CH"), "Top nav", `Mega/sub ${label}`, "Desktop", `Hover/expand ${label}`, "All / subcategories with counts if any"));
  chrome.push(row(id("CH"), "Top nav", `All ${label}`, "Mega open", `Click All ${label}`, "Shop filtered for channel"));
}

for (const [label, href] of shopLinks) {
  chrome.push(row(id("CH"), "Nav destination", label, "Guest", `Go ${href}`, "Page loads; filters/query applied"));
}

for (const [parent, link, url] of megaLinks) {
  chrome.push(
    row(
      id("CH"),
      "Mega menu",
      `${parent} > ${link}`,
      "Desktop",
      `Hover/expand ${parent}; click ${link}`,
      `Lands near ${url}; products, empty, or coming soon`,
    ),
  );
}

for (const [t, s, e] of [
  ["Announcement bar rotate", "Wait for rotation", "Messages cycle; layout stable"],
  ["Sticky header", "Scroll 200px", "Header sticky and usable"],
  ["Hero auto-rotate", "Wait ~5s no hover", "Advances if carousel"],
  ["Hero pause hover", "Hover 6s", "Does not advance or pauses"],
  ["Hero dots", "Click each dot if present", "Slide changes"],
  ["Hero images", "Inspect", "No broken hero images"],
  ["Newsletter empty", "Subscribe empty", "Validation"],
  ["Newsletter invalid", "bad@", "Validation"],
  ["Newsletter valid", "unique@qa.test Subscribe", "Success; POST /newsletter/subscribe"],
]) {
  chrome.push(row(id("CH"), "Home extras", t, "/", s, e));
}

for (const label of topNav) {
  chrome.push(row(id("CH"), "Mobile menu", `Navigate ${label}`, "375px menu", `Tap ${label}`, "Navigates; closes"));
  chrome.push(row(id("CH"), "Mobile menu", `Expand ${label}`, "375px menu", `Chevron ${label}`, "Subs show"));
}
for (const [t, s, e] of [
  ["Sale link", "Tap Sale", "/shop?discounted=true"],
  ["AI Scan", "Tap AI Scan", "AI opens"],
  ["Contact Us", "Tap", "/contact"],
  ["Our Story", "Tap", "/about"],
  ["Wishlist", "Tap", "/wishlist"],
  ["Account", "Tap", "/account"],
  ["Close drawer", "Close", "Closes"],
  ["Search in drawer", "Type query; submit", "Results or /shop?q="],
]) {
  chrome.push(row(id("CH"), "Mobile menu", t, "375px menu open", s, e));
}

for (const [t, s, e] of [
  ["Home", "Tap Home", "/"],
  ["Shop", "Tap Shop", "/shop"],
  ["Saved", "Tap Saved", "/wishlist"],
  ["Account", "Tap Account", "/account"],
  ["Bag", "Tap Bag", "Cart drawer"],
]) {
  chrome.push(row(id("CH"), "Bottom nav", t, "375px", s, e));
}

for (const [t, s, e] of [
  ["Hero CTAs", "Click hero CTA(s)", "Shop/collection"],
  ["Category strip", "Click each category", "Correct shop filter"],
  ["Product rails", "Click product cards", "PDP /product/[handle]"],
  ["Trending section", "Interact", "Links work"],
  ["AI size banner", "Find My Size / Open AI", "AI flow"],
  ["Editorial/edits", "Click edit cards", "Shop filtered"],
]) {
  chrome.push(row(id("CH"), "Home", t, "/", s, e));
}

for (const [t, s, e] of [
  ["Empty cart CTA", "Empty bag; Shop Clothes", "/shop clothes"],
  ["Close drawer", "Close", "Closes"],
  ["Line to PDP", "Click line", "PDP"],
  ["Remove line", "Remove", "Gone; Network"],
  ["Qty minus", "-", "Updates"],
  ["Qty plus", "+", "Updates; stock cap"],
  ["Free shipping progress", "Inspect bar", "Toward $150"],
  ["Subtotal", "Inspect", "Correct"],
  ["Shipping $9 or FREE", "Inspect", "Rule correct"],
  ["Proceed to Checkout guest", "Guest", "Login/account gate"],
  ["Proceed to Checkout customer", "Customer+items", "/checkout"],
]) {
  chrome.push(row(id("CH"), "Cart drawer", t, "As needed", s, e));
}

for (const [t, s, e] of [
  ["Open predictive", "Click Search", "Panel"],
  ["Type query", "jacket", "Suggestions"],
  ["Click result", "Click product", "PDP"],
  ["View all results", "View all", "/shop?q="],
  ["Empty query", "Submit empty", "Handled"],
  ["Close", "Close/outside", "Closes"],
]) {
  chrome.push(row(id("CH"), "Search", t, "Storefront", s, e));
}

for (const l of ["Women", "Men", "Kids", "Shoes", "Beauty", "Accessories", "Tech", "Home"]) {
  chrome.push(row(id("CH"), "Footer Shop", l, "/", `Click footer ${l}`, "Correct destination"));
}
for (const l of ["Track Order", "Shipping", "Returns & Exchanges", "Size Guide", "FAQ"]) {
  chrome.push(row(id("CH"), "Footer Help", l, "/", `Click ${l}`, "Correct page/shop"));
}
for (const l of ["Terms", "Privacy"]) {
  chrome.push(row(id("CH"), "Footer About", l, "/", `Click ${l}`, "/policies/..."));
}
for (const l of ["Instagram", "Facebook", "TikTok", "Email us", "Whatsapp us"]) {
  chrome.push(row(id("CH"), "Footer social", l, "/", `Click ${l}`, "Opens target"));
}
for (const [t, s, e] of [
  ["VIP empty", "Check empty", "Toast/validation"],
  ["VIP invalid email", "bad@", "Validation"],
  ["VIP non-member", "unknown@test.com", "Not VIP; no leak"],
  ["VIP member", "Known VIP", "Confirmed + login CTA"],
  ["Benefits strip", "Inspect", "Free delivery / authentic / returns"],
  ["COD mark only", "Inspect payment marks", "Cash On Delivery only; no fake Apple Pay CTA that charges"],
  ["Floating AI open", "Click floating AI", "Opens"],
  ["Floating AI drag", "Drag", "Moves"],
  ["Floating AI remove", "Remove", "Gone"],
]) {
  chrome.push(row(id("CH"), "Footer/AI", t, "/", s, e));
}

add("manual-tc-01-chrome-home-nav.md", chrome);

// ========== PART 2 ==========
reset();
const cat = [
  "# Part 2 - Scosha shop, filters, PDP, compare, coming soon",
  "",
  header,
];

cat.push(row(id("CAT"), "Shop", "Open /shop", "Guest", "Open /shop", "Catalog loads"));
for (const tab of ["Clothes (Winter)", "Home (Living)", "Skincare (Soon)", "Electronics (Soon)"]) {
  cat.push(row(id("CAT"), "Department tabs", tab, "/shop", `Click ${tab}`, "Filter or coming-soon"));
}

for (const [label, href] of shopLinks) {
  cat.push(row(id("CAT"), "Shop URL", label, "Guest", `Open ${href}`, "Correct products or soon page"));
  cat.push(row(id("CAT"), "Shop URL", `${label} refresh`, "On page", "F5", "Stable"));
  cat.push(row(id("CAT"), "Shop URL", `${label} console`, "On page", "Console", "No app errors"));
  cat.push(row(id("CAT"), "Shop URL", `${label} mobile`, "375px", `Open ${href}`, "No overflow"));
}

for (const [parent, link, url] of megaLinks) {
  cat.push(row(id("CAT"), "Deep shop", `${parent}/${link}`, "Guest", `Open ${url}`, "Correct filter or soon; no crash"));
  cat.push(row(id("CAT"), "Deep shop", `${parent}/${link} empty facets`, "Guest", `Open ${url}; Reset All`, "Stable"));
  cat.push(row(id("CAT"), "Deep shop", `${parent}/${link} mobile`, "375px", `Open ${url}`, "No overflow"));
}

for (const page of [1, 2, 3]) {
  cat.push(row(id("CAT"), "Pagination", `Page ${page}`, "/shop with many", `Go page ${page} if present`, "Products change; URL/query OK"));
}
cat.push(row(id("CAT"), "Pagination", "Next/Prev", "Page 2+", "Next then Prev", "Correct pages"));
cat.push(row(id("CAT"), "Empty catalog", "No results facets", "/shop", "Apply impossible filter combo", "Empty state + clear path"));

for (const s of sorts) {
  cat.push(row(id("CAT"), "Sort", s, "/shop with products", `Select ${s}`, "Order changes"));
}

for (const f of [
  "Department", "Shop by", "Product Type", "Size", "Color", "Brands",
  "Price Min", "Price Max", "On Sale / Discounted", "In Stock Only", "Gender if present",
]) {
  cat.push(row(id("CAT"), "Filter", `Apply ${f}`, "Facets", `Use ${f}`, "Results update"));
  cat.push(row(id("CAT"), "Filter", `Clear chip ${f}`, "Active", "Remove chip", "Restored"));
}
cat.push(row(id("CAT"), "Filter", "Clear all / Reset All", "Multiple", "Reset", "All clear"));
cat.push(row(id("CAT"), "Filter", "Mobile Filters drawer", "375px", "Open Filters; apply; close", "Works"));
cat.push(row(id("CAT"), "Filter", "Show|Hide Filters desktop", "Desktop", "Toggle", "Panel toggles"));
cat.push(row(id("CAT"), "Filter", "Combine size+inStock+sale", "Facets", "Apply 3", "Intersection"));

for (const [t, s, e] of [
  ["Enable compare", "Toggle compare", "Checkboxes appear"],
  ["Select 1 item", "Check product", "Bar shows 1"],
  ["Select 4 items", "Check 4", "Max 4"],
  ["Select 5th blocked", "Try 5th", "Blocked/message"],
  ["Compare modal", "Compare", "Side-by-side"],
  ["Remove from bar", "Remove item", "Updates"],
  ["Clear compare", "Clear", "Reset"],
  ["Close modal", "Close", "Closes"],
  ["Link to PDP from compare", "Click product", "PDP"],
]) {
  cat.push(row(id("CAT"), "Compare", t, "/shop", s, e));
}

for (const [t, s, e] of [
  ["Open PDP", "Click card", "/product/handle"],
  ["Wishlist", "Heart", "Toggles"],
  ["Quick view", "Quick view", "Modal"],
  ["QV close", "Close", "Closes"],
  ["QV add", "In-stock Add", "Cart Network"],
  ["QV OOS", "OOS", "Disabled"],
  ["Color swatch", "Click color", "Updates"],
  ["Add from card", "Add", "Adds or opens"],
  ["Compare checkbox", "Check", "Selected"],
]) {
  cat.push(row(id("CAT"), "ProductCard", t, "/shop", s, e));
}

for (const [t, s, e] of [
  ["In-stock PDP", "Open sco- product", "Gallery price sizes Add"],
  ["OOS PDP", "OOS product", "Add disabled"],
  ["Legacy ama redirect", "Old -ama- URL if any", "Redirects to -sco-"],
  ["Legacy pup redirect", "Old -pup- URL if any", "Redirects to -sco-"],
  ["Invalid handle", "/product/nope-qa-999", "Not found"],
  ["Breadcrumb", "Click crumbs", "Navigate"],
  ["Gallery thumbs", "Click thumbs", "Image changes"],
  ["Color", "Select color", "Updates"],
  ["Size in-stock", "Select size", "Add enabled"],
  ["Size OOS", "OOS size", "Disabled"],
  ["Size guide open", "Size guide", "Modal"],
  ["Size guide close", "Close", "Closes"],
  ["Qty - at 1", "Qty 1", "Disabled"],
  ["Qty +", "Inc", "Up; cap"],
  ["Add to Bag", "Add", "Toast; bag; POST cart"],
  ["Wishlist", "Heart", "Toggles"],
  ["WhatsApp contact", "WhatsApp", "wa.me"],
  ["Sticky mobile add", "375px scroll", "Sticky add works"],
  ["Shipping accordion", "Toggle", "Content"],
  ["Refresh", "F5", "Same product"],
  ["Console", "Check", "No errors"],
  ["Network GET product", "Network", "200"],
]) {
  cat.push(row(id("CAT"), "PDP", t, "Real product handle", s, e));
}

for (const page of ["/skincare", "/electronics"]) {
  cat.push(row(id("CAT"), "Coming soon", `Load ${page}`, "Guest", `Open ${page}`, "Coming soon + waitlist"));
  cat.push(row(id("CAT"), "Coming soon", `Waitlist ${page}`, "Guest", "Submit waitlist email if present", "Success/validation"));
  cat.push(row(id("CAT"), "Coming soon", `CTAs ${page}`, "Guest", "Click CTAs", "Navigate or subscribe"));
}

for (const page of ["/about", "/loyalty", "/gifts", "/giveaways"]) {
  cat.push(row(id("CAT"), "CMS page", page, "Guest", `Open ${page}`, "Content renders"));
}
cat.push(row(id("CAT"), "Gifts", "Sale CTA", "/gifts", "Click sale/shop link", "/shop discounted or shop"));

for (const p of [
  "/policies/privacy", "/policies/returns", "/policies/shipping", "/policies/terms",
]) {
  cat.push(row(id("CAT"), "Policies", p, "Guest", `Open ${p}`, "Readable policy"));
}

add("manual-tc-02-catalog-search-pdp.md", cat);

// ========== PART 3 ==========
reset();
const auth = ["# Part 3 - Scosha auth, cart, COD checkout, account, wishlist", "", header];

for (const [t, s, e] of [
  ["Guest cart persist", "Add; F5", "Kept"],
  ["Multi items", "Add 3", "3 lines"],
  ["Stock cap", "Exceed", "Blocked"],
  ["Failed add UX", "OOS", "Error; no fake success"],
  ["Clear cart if UI", "Clear all", "Empty"],
  ["Qty edit drawer", "Change qty", "PATCH cart"],
  ["Subtotal after remove", "Remove one of two", "Recalculates"],
  ["Free ship threshold edge", "Just under $150", "Shows remaining"],
  ["Free ship at $150", "At/over $150", "FREE shipping"],
  ["Cart empty after last remove", "Remove last", "Empty CTAs"],
  ["Same variant twice", "Add same twice", "Qty increments or two lines per rules"],
  ["Different sizes same product", "Add S and M", "Two lines"],
  ["API down add", "Stop API; Add", "Error; no fake success"],
  ["Slow 3G add", "Slow 3G Add", "Loader then success/error"],
]) {
  auth.push(row(id("CART"), "Cart", t, "Guest/customer", s, e));
}

for (const [t, s, e] of [
  ["Account login mode", "/account?mode=login", "Login UI"],
  ["Account register mode", "/account?mode=register", "Register UI"],
  ["Google method", "Continue with Google", "Flow or config error"],
  ["Email method", "Continue with email", "Email form"],
  ["Phone method", "Continue with phone", "Phone form"],
  ["Back options", "All options", "Chooser"],
  ["Login empty", "Submit", "Validation"],
  ["Login invalid email", "bad@", "Validation"],
  ["Login wrong password", "Wrong", "Generic error"],
  ["Login unknown", "nobody@qa.test", "Generic error"],
  ["Login success", "Verified user", "My Account"],
  ["Register empty", "Submit", "Validation"],
  ["Register weak password", "short", "Validation"],
  ["Register success", "Unique user", "Verify email"],
  ["Duplicate email", "Existing", "Conflict"],
  ["Duplicate phone", "Existing", "Conflict"],
  ["Forgot link", "Forgot password", "/forgot-password"],
  ["Verify email page", "/verify-email", "OTP form"],
  ["OTP wrong", "000000", "Error"],
  ["OTP correct", "Valid OTP", "Verified"],
  ["Resend OTP", "Resend", "Cooldown; Network"],
  ["Forgot valid", "Email submit", "Generic success"],
  ["Reset mismatch", "Different passwords", "Validation"],
  ["Reset success", "Valid token", "Login new pass"],
  ["Welcome modal close", "Maybe later / Close", "Closes"],
  ["Welcome modal Google", "Google", "Flow"],
  ["Welcome modal register", "Complete steps", "Registers"],
  ["Redirect param", "/account?redirect=/checkout", "Returns after login"],
  ["Save wishlist param", "?save=product", "Pending save after login"],
  ["Logout", "Sign out", "Logged out"],
  ["Cart merge", "Guest cart then login", "POST merge"],
]) {
  auth.push(row(id("AUTH"), "Auth", t, "As needed", s, e));
}

for (const [t, s, e] of [
  ["Gate logged out", "Guest /checkout", "Account/login"],
  ["Unverified gate", "Unverified user", "Verify required"],
  ["Address list", "Has addresses", "Radios"],
  ["Select address", "Select Continue", "Delivery step"],
  ["Add address form", "Add new", "Fields"],
  ["Name empty", "Save", "Validation"],
  ["Phone invalid", "Save", "Validation"],
  ["Line empty", "Save", "Validation"],
  ["City empty", "Save", "Validation"],
  ["Country default Lebanon", "Inspect", "Lebanon default"],
  ["Save address", "Valid", "POST addresses"],
  ["Delivery Standard", "Select", "FREE >=150 or $9"],
  ["Delivery Express", "Select", "Higher fee"],
  ["VIP free delivery credit", "VIP with credits", "FREE messaging"],
  ["Coupon empty", "Apply", "Error/no-op"],
  ["Coupon invalid", "BAD", "Error"],
  ["Coupon valid", "Known", "Discount"],
  ["VIP % preview", "VIP pending", "Shown in summary"],
  ["Review step", "Review order", "Summary COD"],
  ["Back navigation", "Back between steps", "Works"],
  ["Place COD order", "Place COD order", "Success confirmation"],
  ["Double click place", "Double click", "One order"],
  ["Offline place", "Offline", "Error no success"],
  ["Totals math", "Review", "Subtotal+ship-discount"],
  ["COD not paid", "After place", "Pending/COD not paid"],
  ["Confirmation page", "/order-confirmation/id", "Order #"],
  ["VIP unlock notice", "First qualifying order", "VIP messaging/modal"],
]) {
  auth.push(row(id("CHK"), "Checkout COD", t, "Customer + cart", s, e));
}

auth.push(row(id("ORD"), "Orders", "List", "Customer", "/orders", "List or empty"));
auth.push(row(id("ORD"), "Orders", "Detail own", "Own id", "Open", "Correct"));
auth.push(row(id("ORD"), "Orders", "Detail IDOR", "Other id", "Open", "Denied"));

for (const tab of ["Details", "Addresses"]) {
  auth.push(row(id("ACC"), "Account tab", tab, "Logged in", `Open ${tab}`, "Content OK"));
}
for (const [t, s, e] of [
  ["Update details", "Save", "Persists"],
  ["Add address", "Valid", "Created"],
  ["Set default", "Set default", "Flag"],
  ["Delete address", "Delete", "Gone"],
  ["Orders link", "Orders", "/orders"],
  ["Wishlist link", "Wishlist", "/wishlist"],
  ["VIP badge", "VIP user", "Shown"],
  ["Sign out", "Sign out", "Logged out"],
]) {
  auth.push(row(id("ACC"), "Account", t, "Customer", s, e));
}

for (const [t, s, e] of [
  ["Guest empty CTAs", "Guest", "Sign in prompts"],
  ["Add from PDP", "Heart", "Listed"],
  ["Remove", "Remove", "Gone"],
  ["Open product", "Click", "PDP"],
  ["Persist", "F5", "Kept"],
]) {
  auth.push(row(id("WISH"), "Wishlist", t, "As needed", s, e));
}

for (const [t, s, e] of [
  ["Contact empty", "Submit", "Validation"],
  ["Contact invalid email", "bad@", "Validation"],
  ["Contact valid", "Fill all", "POST /contact"],
  ["Contact double submit", "Double click", "One message"],
  ["VIP congrats dismiss", "Modal", "Close/Continue shopping"],
  ["VIP congrats ack", "Continue", "POST /vip/congrats/ack"],
  ["Loyalty page CTAs", "/loyalty", "Click shop/CTAs", "Navigate"],
  ["Gifts page CTAs", "/gifts", "Click sale/shop", "Navigate"],
  ["Giveaways page", "/giveaways", "Open + CTAs", "Renders; links work"],
  ["About page", "/about", "Open", "Story content"],
  ["Size guide from footer", "Size Guide", "Guide content or modal"],
  ["FAQ from footer", "FAQ", "FAQ content"],
  ["Track order link", "Track Order", "Orders or help page"],
  ["Shipping policy", "/policies/shipping", "Readable"],
  ["Returns policy", "/policies/returns", "Readable"],
  ["Meta feed route if public", "/api/meta-feed", "JSON or protected as designed"],
]) {
  auth.push(row(id("CNT"), "Contact/VIP/CMS", t, "As needed", s, e));
}

add("manual-tc-03-auth-cart-checkout.md", auth);

// ========== PART 4 AI ==========
reset();
const ai = ["# Part 4 - Scosha AI Shopping Assistant exhaustive", "", header];

for (const [t, s, e] of [
  ["Open header AI", "AI button", "Opens"],
  ["Open floating", "Floating", "Opens"],
  ["Open /ai-scan CTA", "/ai-scan Open AI Assistant", "Opens"],
  ["Open mobile nav AI", "AI Scan", "Opens"],
  ["Open home banner", "AI size banner", "Opens"],
  ["Close", "X", "Closes"],
  ["Back", "Back", "Prev"],
  ["Route change closes", "Navigate", "Closes"],
]) {
  ai.push(row(id("AI"), "Chrome", t, "Storefront", s, e));
}
for (const mode of ["Scan Face", "Scan Body", "Scan Furniture", "Smart Upload"]) {
  ai.push(row(id("AI"), "Mode", mode, "AI home", `Click ${mode}`, "Enters flow"));
}
for (const area of ["Full body", "Upper / arms", "Legs", "Shoes"]) {
  ai.push(row(id("AI"), "Body area", area, "Body capture", `Select ${area}`, "Selected"));
}
for (const [t, s, e] of [
  ["Camera allow", "Allow Capture", "Photo"],
  ["Camera deny", "Deny", "Graceful error"],
  ["Upload JPG/PNG/WEBP", "Upload", "Advances"],
  ["Reject bad file", ".txt / huge", "Rejected"],
]) {
  ai.push(row(id("AI"), "Capture", t, "Capture", s, e));
}
for (const g of ["Women", "Men"]) {
  ai.push(row(id("AI"), "Measurements", `Gender ${g}`, "Measurements", `Select ${g}`, "Selected"));
}
for (const u of ["cm  -  kg", "in  -  lb"]) {
  ai.push(row(id("AI"), "Measurements", `Unit ${u}`, "Measurements", `Select ${u}`, "Units update"));
}
for (const field of ["Age", "Height", "Weight", "Shoe size"]) {
  ai.push(row(id("AI"), "Measurements", `Fill ${field}`, "Measurements", `Enter ${field}`, "Accepted"));
  ai.push(row(id("AI"), "Measurements", `Validate ${field}`, "Required path", `Clear; analyze`, "Validation or optional"));
}
for (const [t, s, e] of [
  ["Analyze face CTA", "Analyze my face", "POST analyze"],
  ["Outfit matches CTA", "Find my outfit matches", "POST analyze"],
  ["Clarify gender/mode", "Clarify options", "Continues"],
  ["Retake / switch mode", "Suggestions", "Works"],
  ["Results cards", "Success", "Up to 5 recs"],
  ["Open product", "Click", "PDP"],
  ["Size notes", "Inspect", "Shown"],
  ["Add to bag from AI", "Add", "Cart"],
  ["Try on", "Try on", "POST try-on"],
  ["GET status", "Network", "GET /ai-assistant/status"],
  ["Rate limit", "Rapid guest", "Limited; no 500"],
  ["API down", "Stop API", "Error recoverable"],
  ["Gemini/Perfect Corp missing", "Keys off", "Clear degradation"],
]) {
  ai.push(row(id("AI"), "Flow", t, "AI", s, e));
}
for (const mode of ["face", "body", "furniture", "auto"]) {
  ai.push(row(id("AI"), "E2E", `${mode} happy path`, "Sample photo", `Complete ${mode}`, "Results or clear blocked"));
  ai.push(row(id("AI"), "E2E", `${mode} cancel`, `In ${mode}`, "Close", "Clean reopen"));
  ai.push(row(id("AI"), "E2E", `${mode} mobile`, "375px", `Run ${mode}`, "Usable"));
  ai.push(row(id("AI"), "E2E", `${mode} slow network`, "Slow 3G", `Run ${mode}`, "Loader then result/error; no hang"));
  ai.push(row(id("AI"), "E2E", `${mode} double analyze`, "Ready", "Double-click analyze", "One request or safe debounce"));
}

for (const [t, s, e] of [
  ["Skin analysis route", "If /api/ai-skin-analysis used", "POST via UI path", "200/4xx; no 500"],
  ["Furniture empty catalog", "No furniture match", "Complete furniture", "Clear empty messaging"],
  ["Face no skincare stock", "Face mode", "Complete face", "No fake skincare SKUs if Coming Soon"],
  ["Privacy camera indicator", "Capture", "Inspect", "User knows camera/upload in use"],
  ["Consent/copy", "AI home", "Read copy", "No overclaim medical diagnosis"],
]) {
  ai.push(row(id("AI"), "Edge", t, "AI", s, e));
}

add("manual-tc-04-ai.md", ai);

// ========== PART 5 ADMIN ==========
reset();
const adm = ["# Part 5 - Scosha admin panel exhaustive", "", header];

adm.push(row(id("ADM"), "Auth", "Login page", "Logged out", `${ENV.admin}/login`, "Email Password Sign in"));
for (const [t, s, e] of [
  ["Empty submit", "Submit", "Validation"],
  ["Wrong password", "Wrong", "Error"],
  ["Valid login", "Seed admin", "Dashboard"],
  ["Logout", "Logout", "Login"],
  ["Deep link guard", "Logged out /admin/products", "Redirect login"],
  ["Session F5", "F5", "Stays"],
  ["Via :5174", "http://localhost:5174/admin/login", "Works"],
  ["Via :3000/admin", "http://localhost:3000/admin/login", "Works"],
]) {
  adm.push(row(id("ADM"), "Auth", t, "Admin", s, e));
}

for (const item of adminNav) {
  adm.push(row(id("ADM"), "Nav", `Open ${item}`, "Admin", `Sidebar ${item}`, "Loads"));
  adm.push(row(id("ADM"), "Nav", `Refresh ${item}`, "On page", "F5", "Auth OK"));
  adm.push(row(id("ADM"), "Nav", `Console ${item}`, "On page", "Console", "No app errors"));
  adm.push(row(id("ADM"), "Nav", `Mobile ${item}`, "390px", `Open ${item}`, "Usable"));
}

for (const w of [
  "Stats", "Charts", "Latest orders", "Top products", "Low stock", "Recent customers",
]) {
  adm.push(row(id("ADM"), "Dashboard", w, "Admin", "Inspect", "Renders"));
}

function crud(name, createLabel) {
  for (const [t, s, e] of [
    ["List", "Open", "Visible"],
    ["Search hit", "Known", "Filters"],
    ["Search miss", "zzzqa", "Empty"],
    ["Clear search", "Clear", "Full list"],
    [`${createLabel} open`, `Click ${createLabel}`, "Form"],
    ["Create empty validation", "Submit empty", "Errors"],
    ["Create success", "Valid unique", "Saved Network"],
    ["Edit open", "Edit", "Prefill"],
    ["Edit save", "Change save", "Persists"],
    ["Delete cancel", "Cancel", "Remains"],
    ["Delete confirm", "Confirm", "Removed"],
    ["Pagination", "If many", "Works"],
    ["Status filter", "If present", "Filters"],
  ]) {
    adm.push(row(id("ADM"), name, t, "Admin", s, e));
  }
}

crud("Products", "Add product");
for (const field of [
  "Name", "Slug", "Description", "Images", "Tags", "Brand", "Category", "Subcategory",
  "Status", "Badge", "Base price", "Compare at",
]) {
  adm.push(row(id("ADM"), "Product form", `Field ${field}`, "Form", `Set ${field}`, "Validates/saves"));
}
for (const st of ["draft", "active", "archived"]) {
  adm.push(row(id("ADM"), "Product form", `Status ${st}`, "Form", `Set ${st}`, "Storefront visibility matches"));
}
for (const [t, s, e] of [
  ["Add variant", "Size/color/price/stock", "Added"],
  ["Save stock", "Save stock", "Updates"],
  ["Delete variant", "Delete", "Gone"],
  ["Live storefront", "Active+stock", "Purchasable on /shop"],
  ["sco- handle", "Create", "Handle uses sco convention"],
]) {
  adm.push(row(id("ADM"), "Product form", t, "Admin", s, e));
}

crud("Size Charts", "Add size chart");
adm.push(row(id("ADM"), "Size Chart form", "Add Field", "Form", "Add Field", "Added"));
adm.push(row(id("ADM"), "Size Chart form", "Add Size Row", "Form", "Add Size Row", "Added"));
adm.push(row(id("ADM"), "Size Chart form", "Save", "Valid", "Save Size Chart", "Persists"));

crud("Categories", "Add category");
adm.push(row(id("ADM"), "Categories", "Reorder", "If UI", "Reorder", "API persists"));
crud("Brands", "Add brand");
crud("Collections", "Add collection");

for (const [t, s, e] of [
  ["List/search", "Open Orders", "Rows"],
  ["Filter status", "Pending", "Filtered"],
  ["Detail", "Open", "Customer items totals"],
  ["Totals match storefront", "Compare", "Equal"],
  ["COD not paid wrongly", "Inspect", "Pending/COD"],
  ["Update status", "Update status", "Persists"],
  ["Bad transition", "Illegal", "Rejected"],
  ["Save tracking", "Tracking Save", "Persists"],
  ["Packing receipt", "Packing receipt", "PDF download"],
  ["Cancel", "Cancel", "Cancelled"],
  ["Refund", "Refund", "Safe handling"],
  ["Customer sees update", "Customer /orders", "Updated"],
]) {
  adm.push(row(id("ADM"), "Orders", t, "Admin + test order", s, e));
}

crud("Customers", "N/A list");
adm.push(row(id("ADM"), "Customers", "Detail", "View", "Orders shown"));
adm.push(row(id("ADM"), "Customers", "Delete", "Confirm", "Removed"));
adm.push(row(id("ADM"), "Customers", "Users alias", "/admin/users", "Redirects customers"));

for (const [t, s, e] of [
  ["List/search", "Open VIP", "List"],
  ["Edit Save", "Flags/credits Save", "Persists"],
  ["View customer", "View", "Customer detail"],
  ["Announce early access", "Announce Send", "Broadcast handled"],
]) {
  adm.push(row(id("ADM"), "VIP", t, "Admin", s, e));
}

for (const [t, s, e] of [
  ["Filter", "Status", "Filtered"],
  ["Approve", "Approve", "OK"],
  ["Reject", "Reject", "OK"],
  ["Reply send", "Send reply", "Saved"],
]) {
  adm.push(row(id("ADM"), "Reviews", t, "Admin", s, e));
}

crud("Coupons", "Add coupon");
adm.push(row(id("ADM"), "Coupons", "Checkout honor", "Create code", "Apply at checkout", "Discount"));
adm.push(row(id("ADM"), "Coupons", "Expired reject", "Past expiry", "Checkout", "Rejected"));

for (const [t, s, e] of [
  ["List", "Open", "Rows"],
  ["Set", "Set", "PDP matches"],
  ["+1", "+1", "Inc"],
  ["-1", "-1", "Dec"],
  ["No negative", "At 0", "Blocked"],
]) {
  adm.push(row(id("ADM"), "Inventory", t, "Admin", s, e));
}

for (const [t, s, e] of [
  ["Upload", "jpg/png", "Appears"],
  ["Reject bad", "exe", "Rejected"],
  ["Delete", "Confirm", "Gone"],
]) {
  adm.push(row(id("ADM"), "Media", t, "Admin", s, e));
}

crud("Homepage", "Add section");
crud("Pages", "Add page");
crud("Blogs", "Add post");
crud("FAQs", "Add FAQ");

for (const [t, s, e] of [
  ["List", "Open", "Messages"],
  ["Mark as read", "Mark as read", "Read"],
  ["Reply if API", "Reply", "Handled"],
]) {
  adm.push(row(id("ADM"), "Contact inbox", t, "After contact form", s, e));
}

adm.push(row(id("ADM"), "Newsletter", "List", "Open", "List", "OK"));
adm.push(row(id("ADM"), "Newsletter", "CSV", "Export CSV", "File", "OK"));
adm.push(row(id("ADM"), "Newsletter", "Excel", "Export Excel", "File", "OK"));

for (const r of [
  "Bestsellers", "Daily sales", "Weekly", "Sales", "Revenue", "Orders", "Customers", "Products", "Inventory",
]) {
  adm.push(row(id("ADM"), "Reports", `View ${r}`, "Admin", "Open", "Renders"));
  for (const fmt of ["CSV", "Excel", "PDF"]) {
    adm.push(row(id("ADM"), "Reports", `${r} ${fmt}`, "Admin", `Export ${fmt}`, "Download or clean disable"));
  }
}

adm.push(row(id("ADM"), "Notifications", "List", "Open", "Items", "OK"));
adm.push(row(id("ADM"), "Notifications", "Mark read", "Mark", "Read", "OK"));
adm.push(row(id("ADM"), "Notifications", "Mark all", "Mark all", "All read", "OK"));

crud("Roles", "Add role");
adm.push(row(id("ADM"), "Roles", "Permission matrix", "Toggle Save", "Limited admin respects", "OK"));
crud("Admins", "Add admin");
adm.push(row(id("ADM"), "Admins", "Limited login", "Restricted role login", "Only allowed modules", "OK"));
adm.push(row(id("ADM"), "Admins", "Inactive login", "Inactive", "Rejected", "OK"));

for (const field of [
  "Store email", "Shipping standard", "Shipping express", "Free shipping threshold",
  "Tax rate", "SEO fields", "Social URLs",
]) {
  adm.push(row(id("ADM"), "Settings", field, "Settings", `Edit ${field} Save`, "Persists"));
}
adm.push(row(id("ADM"), "Settings", "Save settings", "Save settings", "Success", "Network"));
adm.push(row(id("ADM"), "Profile", "Change password", "Valid new", "Re-login", "OK"));
adm.push(row(id("ADM"), "Branding quirk", "Sidebar logo letter", "Inspect", "Note if still shows A vs S", "Document; fix if required for launch"));

add("manual-tc-05-admin.md", adm);

// ========== PART 6 ==========
reset();
const sec = ["# Part 6 - Scosha security, responsive, a11y, journeys", "", header];

const xssPayloads = ["script-alert-payload", "img-onerror-payload", "mustache-payload", "svg-onload-payload"];
const xssTargets = [
  "Register name", "Contact message", "Search query", "Address line", "Admin product name", "Coupon code display",
];
for (const target of xssTargets) {
  for (const p of xssPayloads) {
    sec.push(row(id("SEC"), "XSS", `${target} / ${p}`, "As role", `Submit ${p}`, "Escaped; no script"));
  }
}

for (const [t, s, e] of [
  ["IDOR order", "A opens B /orders/id", "Denied"],
  ["IDOR address", "Tamper address id", "Denied"],
  ["Customer /admin", "Visit /admin/products", "Blocked"],
  ["Customer admin API", "GET /admin/orders", "401/403"],
  ["No token orders", "GET /orders", "401"],
  ["Open redirect", "/account?redirect=https://evil.example", "Internal only"],
  ["Logout token dead", "Reuse token", "401"],
  ["Login enum", "Wrong user vs pass", "Same message"],
  ["VIP enum", "Random emails", "No leak"],
  ["Forgot enum", "Random email", "Generic success"],
  ["Upload dangerous", "html/svg as image", "Rejected"],
  ["No stack to user", "Force error", "Friendly only"],
  ["CORS foreign origin", "Call API foreign", "Blocked if not allowlisted"],
]) {
  sec.push(row(id("SEC"), "Security", t, "Test accounts", s, e));
}

const viewports = [
  [375, 812, "Phone"],
  [390, 844, "Phone2"],
  [768, 1024, "Tablet"],
  [1024, 768, "TabletLand"],
  [1366, 768, "Laptop"],
  [1920, 1080, "Desktop"],
];
const vpPages = [
  "/", "/shop", "/account", "/checkout", "/wishlist", "/ai-scan", "/contact",
  "/skincare", "/electronics", "/gifts", "/loyalty", "/giveaways", "/about",
  "/admin/login", "/admin/products", "/admin/orders", "/admin/inventory", "/orders",
];
for (const [w, h, name] of viewports) {
  for (const p of vpPages) {
    sec.push(
      row(
        id("UX"),
        `Responsive ${name}`,
        `${p} @${w}x${h}`,
        `Viewport ${w}x${h}`,
        `Open ${p}`,
        "No horizontal overflow; actions reachable; bottom nav OK on phone",
      ),
    );
  }
}

for (const [t, s, e] of [
  ["Tab header", "Tab", "Focus visible"],
  ["Tab account form", "Tab", "Logical"],
  ["Enter/Space buttons", "Activate", "Works"],
  ["Esc drawers/modals", "Esc", "Closes"],
  ["Focus restore", "Close drawer", "Back to opener"],
  ["Labels account/checkout", "Inspect", "Labelled"],
  ["H1 home", "Inspect", "Present"],
  ["Contrast", "Visual", "Readable"],
]) {
  sec.push(row(id("UX"), "A11y", t, "Storefront", s, e));
}

for (const p of [
  "/", "/shop", "/account", "/checkout", "/ai-scan", "/admin", "/admin/orders", "/admin/products",
]) {
  sec.push(row(id("UX"), "Console", `Load ${p}`, "Apps up", `Open ${p}`, "No Scosha app exceptions"));
  sec.push(row(id("UX"), "Network", `No 5xx ${p}`, "Apps up", "Network", "No unexpected 5xx"));
}

const journeys = [
  "Guest Women shop PDP Add Checkout-gate Register Verify Place COD Confirm Admin status update Customer sees",
  "Search predictive View all Filter In stock Sort price Compare 2 Buy COD",
  "AI Body results Add Checkout COD",
  "AI Furniture Home textiles PDP",
  "AI Face beauty suggestions Coming soon skincare CTAs",
  "Admin create product Storefront /shop shows Guest buys last unit Second fails",
  "Admin coupon Customer applies at checkout",
  "Contact form Admin mark read",
  "Newsletter VIP check Footer Admin export CSV",
  "VIP $300 order Congrats modal Ack Footer VIP true",
  "Forgot reset Login new password",
  "Guest cart Login merge Place COD",
  "Mobile 375 bottom-nav full purchase",
  "Limited admin cannot open Settings/Admins",
  "Two browsers stock=1 race one wins",
  "Skincare waitlist + Electronics waitlist",
  "Loyalty/Gifts/Giveaways pages to shop CTAs",
];
journeys.forEach((j, i) => {
  sec.push(row(id("E2E"), "Journey", `J${i + 1}`, "Fresh fixtures", j, "Full success; API/DB consistent"));
});

add("manual-tc-06-security-ux-journeys.md", sec);

// ========== PART 7 MATRICES ==========
reset();
const mx = ["# Part 7 - Scosha atomic matrices (roles x pages x network x transitions)", "", header];

const storePages = [
  "/", "/shop", "/account", "/wishlist", "/checkout", "/orders", "/contact", "/about",
  "/ai-scan", "/skincare", "/electronics", "/loyalty", "/gifts", "/giveaways",
  "/forgot-password", "/reset-password", "/verify-email", "/order-confirmation/demo",
  "/policies/privacy", "/policies/terms", "/policies/shipping", "/policies/returns",
];
for (const role of ["Guest", "Customer"]) {
  for (const p of storePages) {
    mx.push(row(id("MX"), `${role} page`, `Load ${p}`, role, `Open ${p}`, "Renders or correct gate"));
    mx.push(row(id("MX"), `${role} page`, `Console ${p}`, role, "Console", "No app errors"));
    mx.push(row(id("MX"), `${role} page`, `Refresh ${p}`, role, "F5", "Stable"));
  }
}

for (const href of deepShopUrls) {
  for (const s of sorts) {
    mx.push(row(id("MX"), "ShopxSort", `${href} / ${s}`, "Guest", `Open ${href}; sort ${s}`, "Applies without crash"));
  }
  mx.push(row(id("MX"), "ShopxEmpty", `${href} reset`, "Guest", `Open ${href}; Reset All`, "Stable"));
  mx.push(row(id("MX"), "ShopxMobile", `${href} 375`, "375px", `Open ${href}`, "No overflow"));
}

for (const st of ["throttle Slow 3G", "offline then online", "API stopped", "API 500 mock if possible"]) {
  for (const p of ["/", "/shop", "/checkout", "/account", "/admin/products", "/admin/orders", "/ai-scan", "/wishlist"]) {
    mx.push(row(id("MX"), "Resilience", `${p} under ${st}`, "DevTools", `Open ${p}`, "Error/retry; no infinite spinner"));
  }
}

const mutations = [
  ["POST /auth/register", "Register"],
  ["POST /auth/verify-email", "Verify OTP"],
  ["POST /auth/resend-otp", "Resend OTP"],
  ["POST /auth/login", "Login"],
  ["POST /auth/google", "Google login"],
  ["POST /auth/forgot-password", "Forgot"],
  ["POST /auth/reset-password", "Reset"],
  ["POST /auth/logout", "Logout"],
  ["POST /cart/items", "Add cart"],
  ["PATCH /cart/items/:id", "Update qty"],
  ["DELETE /cart/items/:id", "Remove line"],
  ["POST /cart/merge", "Merge cart"],
  ["POST /wishlist/:id", "Wishlist add"],
  ["DELETE /wishlist/:id", "Wishlist remove"],
  ["POST /addresses", "Create address"],
  ["PUT /addresses/:id", "Update address"],
  ["PATCH /addresses/:id/default", "Default address"],
  ["DELETE /addresses/:id", "Delete address"],
  ["POST /coupons/validate", "Coupon"],
  ["POST /orders/preview", "Preview"],
  ["POST /orders", "Place COD"],
  ["POST /newsletter/subscribe", "Newsletter"],
  ["POST /contact", "Contact"],
  ["POST /vip/check", "VIP check"],
  ["POST /vip/congrats/ack", "VIP ack"],
  ["GET /ai-assistant/status", "AI status"],
  ["POST /ai-assistant/analyze", "AI analyze"],
  ["POST /ai-assistant/try-on", "AI try-on"],
  ["POST /admin/auth/login", "Admin login"],
  ["POST /admin/products", "Create product"],
  ["PATCH /admin/products/:id", "Update product"],
  ["DELETE /admin/products/:id", "Delete product"],
  ["PATCH /admin/inventory", "Inventory"],
  ["PATCH /admin/orders/:id/status", "Order status"],
  ["POST /admin/orders/:id/cancel", "Cancel"],
  ["GET packing-slip", "Packing receipt"],
  ["POST /admin/coupons", "Create coupon"],
  ["POST /admin/media", "Upload media"],
  ["PUT /admin/settings", "Settings"],
  ["POST /admin/roles", "Create role"],
  ["POST /admin/admins", "Create admin"],
  ["POST /auth/refresh", "Token refresh"],
  ["DELETE /cart", "Clear cart if exposed"],
  ["GET /admin/dashboard/stats", "Dashboard stats"],
  ["DELETE /admin/media/:id", "Delete media"],
  ["POST /admin/products/:id/variants", "Add variant if separate"],
  ["PATCH /admin/reviews/:id", "Review moderate"],
  ["POST /admin/vip/announce", "VIP announce"],
  ["GET /admin/newsletter/export", "Newsletter export"],
  ["POST /admin/size-charts", "Create size chart"],
  ["POST /admin/categories", "Create category"],
  ["POST /admin/brands", "Create brand"],
  ["POST /admin/collections", "Create collection"],
  ["POST /admin/blogs", "Create blog"],
  ["POST /admin/faqs", "Create FAQ"],
  ["PUT /admin/homepage-sections", "Homepage sections"],
];
for (const [api, action] of mutations) {
  mx.push(
    row(
      id("MX"),
      "Network mutation",
      action,
      "Trigger via UI",
      `Watch Network for ${action}`,
      `${api} expected status; UI matches`,
    ),
  );
}

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
for (const from of orderStatuses) {
  for (const to of orderStatuses) {
    if (from === to) continue;
    mx.push(
      row(
        id("MX"),
        "Order transition",
        `${from} -> ${to}`,
        "Admin order",
        `Attempt ${to}`,
        "Legal transition OK; illegal rejected",
      ),
    );
  }
}

for (const module of adminNav) {
  for (const [name, pre, exp] of [
    ["Empty state", "No rows / filter none", "Empty message"],
    ["Loading", "Slow 3G", "Loader then content"],
    ["Permission hidden", "Limited role", "Hidden or 403"],
    ["Unauthorized API", "Call without perm", "403"],
  ]) {
    mx.push(row(id("MX"), `Admin ${module}`, name, pre, `On ${module}`, exp));
  }
}

for (const field of [
  "product name empty", "product name 255+ chars", "price negative", "price zero", "stock negative",
  "stock decimal", "slug spaces", "slug duplicate", "image bad URL", "compareAt < price",
]) {
  mx.push(row(id("MX"), "Product validation", field, "Admin product form", `Try ${field}`, "Validation prevents bad save"));
}

for (const field of [
  "coupon code empty", "coupon code duplicate", "percent > 100", "fixed > cart", "min order negative",
  "expiry past", "usage limit 0", "usage limit exceeded at checkout",
]) {
  mx.push(row(id("MX"), "Coupon validation", field, "Admin/checkout", `Try ${field}`, "Rejected correctly"));
}

for (const field of [
  "address phone invalid", "OTP empty", "password weak", "register email invalid",
  "checkout name empty", "checkout city empty", "contact message empty", "newsletter bad email",
]) {
  mx.push(row(id("MX"), "Storefront validation", field, "Relevant form", `Try ${field}`, "Blocked with message"));
}

for (const input of [
  "emoji in name", "Arabic RTL", "Chinese characters", "500-char string",
  "leading/trailing spaces", "OR 1=1 text", "null byte visually", "HTML tags in name",
]) {
  mx.push(row(id("MX"), "Input fuzz", input, "Register/contact/address", `Enter ${input}`, "Safe; no crash"));
}

for (const browser of ["Chrome", "Edge", "Firefox if available"]) {
  for (const p of ["/", "/shop", "/checkout", "/admin/login", "/ai-scan"]) {
    mx.push(row(id("MX"), `Browser ${browser}`, p, browser, `Open ${p}`, "Critical path works"));
  }
}

for (const action of [
  "Register double submit", "Login double submit", "Add to bag double click",
  "Place COD double click", "Contact double submit", "Admin save double click",
  "Inventory +1 spam", "Coupon apply twice", "VIP check spam",
]) {
  mx.push(row(id("MX"), "Idempotency", action, "Ready", action, "No duplicate side effects"));
}

add("manual-tc-07-matrices.md", mx);

// Write
const parts = [];
let total = 0;
for (const [file, lines] of Object.entries(files)) {
  const count = lines.filter((l) => l.startsWith("| ") && !l.startsWith("| ID") && !l.startsWith("| ---")).length;
  total += count;
  parts.push({ file, count });
  fs.writeFileSync(path.join(outDir, file), `${lines.join("\n")}\n`);
}

const index = `# Scosha - Exhaustive Manual Browser Test Cases (Master Index)

**Goal:** Pre-deployment coverage of every storefront control, AI flow, admin module, and cross-cutting check.

**Stack under test**
- Storefront: Next.js \`${ENV.store}\`
- Admin: Vite \`${ENV.admin}\` (or :5174/admin)
- API: Express \`${ENV.api}\`
- Payment: **Cash on Delivery only**

**Status values:** PASS / FAIL / BLOCKED / NOT RUN

## Parts

| # | File | Cases |
| --- | --- | ---: |
${parts.map((p, i) => `| ${i + 1} | [${p.file}](./${p.file}) | ${p.count} |`).join("\n")}
| | **TOTAL** | **${total}** |

## How to run

1. From \`scosha-main\`: start API (:5000), storefront (:3000), admin (:5174) - e.g. \`npm run dev:all\`.
2. Use dedicated Customer A, Customer B, Admin accounts only (never production).
3. Keep DevTools **Console + Network** open for mutation cases.
4. Use real \`sco-\` product handles from your DB for PDP cases.
5. Log defects in \`bug-report.md\` with **Case ID** + screenshot.
6. Update the Status column as you execute.

## What is covered

1. Chrome / home / MAIN_NAV / mobile drawer / bottom nav / cart / search / footer VIP
2. Shop filters/sort/compare, PDP, coming soon, CMS/marketing, policies
3. Auth (Google/email/phone/OTP), COD checkout, account, wishlist
4. AI Scan (face/body/furniture/smart upload, try-on, rate limits)
5. Admin (every sidebar module, CRUD, orders/packing, VIP, reports)
6. Security / 6 viewports / a11y / console / E2E journeys
7. Matrices (role x page, shop x sort, order transitions, network mutations, fuzz)

Regenerate: \`node scripts/generate-manual-test-cases.mjs\`

Automated tests are supplemental and do **not** replace this manual suite.
`;

fs.writeFileSync(path.join(outDir, "manual-browser-test-cases.md"), index);

const indexTc = `# Scosha - Test Cases Index

## Exhaustive manual browser suite (primary before deploy)

**Master index:** [manual-browser-test-cases.md](./manual-browser-test-cases.md)

| Part | File |
| ---: | --- |
| 1 | [manual-tc-01-chrome-home-nav.md](./manual-tc-01-chrome-home-nav.md) |
| 2 | [manual-tc-02-catalog-search-pdp.md](./manual-tc-02-catalog-search-pdp.md) |
| 3 | [manual-tc-03-auth-cart-checkout.md](./manual-tc-03-auth-cart-checkout.md) |
| 4 | [manual-tc-04-ai.md](./manual-tc-04-ai.md) |
| 5 | [manual-tc-05-admin.md](./manual-tc-05-admin.md) |
| 6 | [manual-tc-06-security-ux-journeys.md](./manual-tc-06-security-ux-journeys.md) |
| 7 | [manual-tc-07-matrices.md](./manual-tc-07-matrices.md) |

**Total: see master index.**  
Regenerate: \`node scripts/generate-manual-test-cases.mjs\`

## Related

| Doc | Purpose |
| --- | --- |
| [test-plan.md](./test-plan.md) | Strategy / environment |
| [bug-report.md](./bug-report.md) | Defect log |
| [test-results.md](./test-results.md) | Execution summary |
| [release-readiness.md](./release-readiness.md) | Go / no-go |
`;
fs.writeFileSync(path.join(outDir, "test-cases.md"), indexTc);

const plan = `# Scosha - Pre-Deployment Manual QA Test Plan

## Environment

| App | URL |
| --- | --- |
| Storefront | ${ENV.store} |
| Admin | ${ENV.admin} |
| API | ${ENV.api} |
| DB | MySQL (Docker often host port 3307 / db \`scosha\`) |

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

See \`manual-browser-test-cases.md\` (exhaustive 7-part suite; regenerate for live total).
`;
fs.writeFileSync(path.join(outDir, "test-plan.md"), plan);

const bug = `# Scosha - Bug Report

| ID | Severity | Case ID | Area | Steps | Expected | Actual | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | P0/P1/P2/P3 | | | | | | | Open |

Severity: P0 critical  -  P1 high  -  P2 medium  -  P3 low
`;
fs.writeFileSync(path.join(outDir, "bug-report.md"), bug);

const results = `# Scosha - Test Results

| Suite | Total | PASS | FAIL | BLOCKED | NOT RUN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Manual Part 1 | | | | | |
| Manual Part 2 | | | | | |
| Manual Part 3 | | | | | |
| Manual Part 4 | | | | | |
| Manual Part 5 | | | | | |
| Manual Part 6 | | | | | |
| Manual Part 7 | | | | | |
| **TOTAL** | | | | | |

Fill after execution. Do not count blocked/not-run as pass.
`;
fs.writeFileSync(path.join(outDir, "test-results.md"), results);

const ready = `# Scosha - Release Readiness

**Decision:** NOT READY until manual suite critical paths are executed.

## Gate checklist

- [ ] Guest browse + shop filters + PDP + cart
- [ ] Register/verify + COD order + confirmation
- [ ] Admin processes order + packing receipt
- [ ] AI face/body/furniture smoke
- [ ] Authz: customer cannot access admin; no IDOR orders
- [ ] Production builds + staging env verified
- [ ] No open P0/P1 in bug-report.md

## Blockers / your actions

1. Staging MySQL + secrets (not Amaz shared)
2. Real SMTP verification
3. Gemini / Perfect Corp keys if AI required in prod
4. Confirm COD-only payment copy matches live policy
`;
fs.writeFileSync(path.join(outDir, "release-readiness.md"), ready);

console.log(JSON.stringify({ total, parts, outDir }, null, 2));
