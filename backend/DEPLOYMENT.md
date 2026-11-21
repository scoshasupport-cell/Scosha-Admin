# SCOSHA Backend — Deployment Guide

Scosha is a **standalone** deployment. Use a dedicated MySQL schema, Cloudinary account, SMTP, and secrets. Do not connect to Amaz’s database or reuse Amaz Cloudinary keys.

## Prerequisites

- Node.js 18+
- MySQL 8 (schema `scosha` only)
- **Scosha-owned** Cloudinary account (`CLOUDINARY_FOLDER=scosha`)
- Transactional email: **Resend** (recommended) with a verified domain — see [EMAIL_DELIVERABILITY.md](./EMAIL_DELIVERABILITY.md). Avoid personal Gmail for customer mail.

## Local development

```bash
# 1. Scosha MySQL
docker compose up -d mysql

# 2. Backend
cd backend
cp .env.example .env   # DATABASE_URL → scosha DB; Cloudinary → Scosha account
npm install
npx prisma generate
npx prisma migrate deploy   # or: npm run db:push
npm run seed
# Optional:
#   npm run import:scosha
#   npm run rewrite:sco-codes
#   npm run migrate:images
npm run dev

# 3. Storefront (repo root)
cd ..
npm install
npm run dev                 # http://localhost:3000

# 4. Admin
cd admin && npm install && npm run dev
# Open http://localhost:3000/admin/
```

Default admin: `admin@scosha.com` / `Admin@123`

URLs:
- API: http://localhost:5000
- Docs: http://localhost:5000/api/docs
- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin

## Docker (API + MySQL)

```bash
cp backend/.env.example backend/.env
# Fill Scosha-only secrets
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node src/scripts/seed.js
```

Compose uses:
- container `scosha-mysql` / volume `scosha_mysql_data`
- database `scosha` / user `scosha`
- host port **3307**

## Production checklist

1. Strong unique `JWT_*` and `COOKIE_SECRET` (never reuse Amaz secrets)
2. Own `DATABASE_URL` (own MySQL host/schema — never Amaz DB)
3. `NODE_ENV=production`, `LOG_LEVEL=info`
4. Restrict `CORS_ORIGINS` / `STOREFRONT_URL` / `ADMIN_URL` to Scosha domains
5. Own Cloudinary folder (`scosha`) and Resend (`RESEND_API_KEY`) with verified-domain `SMTP_FROM`
6. HTTPS; rotate admin password after first login
7. Backup **Scosha** MySQL regularly
8. Deploy storefront, API, and admin on Scosha infrastructure only

## Environment variables

See [backend/.env.example](./.env.example).

Critical:
- `DATABASE_URL` — Scosha MySQL only
- `ADMIN_EMAIL` — Scosha order notifications
- `RESEND_API_KEY` / `SMTP_*` — Scosha outbound mail (see EMAIL_DELIVERABILITY.md)
- `CLOUDINARY_*` + `CLOUDINARY_FOLDER=scosha`

## Separation from Amaz

| Concern | Amaz | Scosha |
|---------|------|--------|
| Repo / deploy | Amaz hosting | Scosha hosting |
| MySQL | `amaz` DB | `scosha` DB |
| Docker | `amaz-mysql` | `scosha-mysql` |
| Admin auth storage key | amaz-admin-auth | scosha-admin-auth |
| Features | commerce suite | **same features** |
| Catalog | Amaz data | can import same product data into Scosha DB |
