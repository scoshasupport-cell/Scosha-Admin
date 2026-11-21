# Scosha — standalone commerce stack

Scosha runs on **its own** infrastructure. Do not share Amaz’s database, API, Cloudinary account, or secrets.

| Layer | Scosha |
|-------|--------|
| Codebase | `scosha-main` |
| Storefront | Next.js `:3000` |
| API | Express `:5000` (`scosha-api`) |
| Database | MySQL schema **`scosha`** only |
| Cloudinary | **Scosha-owned** account + folder `scosha/` |
| Admin | Scosha admin (`/admin`) |

## Environment

```bash
# backend/.env — required
DATABASE_URL=mysql://scosha:…@localhost:3306/scosha
CLOUDINARY_CLOUD_NAME=<scosha-cloud>
CLOUDINARY_API_KEY=<scosha-key>
CLOUDINARY_API_SECRET=<scosha-secret>
CLOUDINARY_FOLDER=scosha
STOREFRONT_URL=http://localhost:3000

# storefront (.env.local) — Meta catalog feed
NEXT_PUBLIC_SITE_URL=https://scosha.com
NEXT_PUBLIC_META_FEED_CURRENCY=USD
```

Create a Cloudinary account for Scosha and paste those keys. Do **not** reuse Amaz credentials in production.

## Meta catalog feed (Facebook / Instagram)

Products stay in MySQL. Meta reads a live feed — no Excel re-upload.

| | |
|--|--|
| Feed URL | `https://YOURDOMAIN/api/meta-feed` |
| Local test | `http://localhost:3000/api/meta-feed` |
| Format | TSV (`text/tab-separated-values`) from active products |

**Connect once in Meta Commerce Manager**

1. Open your Scosha catalog → **Data sources** → add a **Data feed**.
2. Choose **URL / scheduled feed** (not manual file upload).
3. Paste `https://YOURDOMAIN/api/meta-feed`.
4. Set a fetch schedule (e.g. daily). Meta must reach a **public HTTPS** URL — localhost will not work for Meta’s servers.

**Workflow after that:** Add/edit in Scosha Admin → Publish → wait for Meta’s next scheduled fetch → product appears in Facebook/Instagram catalog.

Columns: `id`, `title`, `description`, `availability`, `condition`, `price`, `link`, `image_link`, `brand`. Products without a usable absolute image or price are skipped.

**Not included yet:** Meta Pixel + Conversions API (needs your Pixel ID + CAPI access token). Feed = catalog products; Pixel = shopper events (ViewContent, AddToCart, Purchase).

Optional: re-host product images into the Scosha folder:

```bash
npm run migrate:images
```

## Run

```bash
cd backend && npm run dev          # API :5000
cd admin && npm run dev            # admin :5174
npm run dev                        # storefront :3000
```

Admin: `admin@scosha.com` / `Admin@123` (after `npm run seed`)

## VIP Customer Access

Automatic on a single order subtotal of **$300+**:

- VIP membership + early access
- **10%** pending discount on the next order (one-time)
- **+5** free standard delivery credits
- Congrats popup (once) + unlock email
- Footer **Private Access** checks VIP via `POST /api/v1/vip/check` (rate-limited; no sensitive fields)

Admin: **VIP Customers** (`/vip-customers`) — list, edit benefits, grant/revoke, early-access email broadcast.

Collections visibility: `draft` | `vip_early_access` | `public` (+ optional `publicAt` auto-publish).

See `backend/DEPLOYMENT.md`.
