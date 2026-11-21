# SCOSHA Backend

Standalone Express + Prisma + MySQL API for the Scosha storefront and admin.  
**Own database, Cloudinary, secrets, and deployment** — not shared with Amaz.

## Stack

- Node.js + Express (MVC + Repository/Service)
- MySQL 8 + Prisma
- JWT + bcrypt + RBAC
- Zod validation, Helmet, CORS, Morgan, Compression, Rate limiting
- Cloudinary + Multer, Nodemailer, Winston (`scosha-api`)
- Swagger UI at `/api/docs`

## Quick start

```bash
# From repo root — Scosha MySQL
docker compose up -d mysql

cd backend
cp .env.example .env   # set DATABASE_URL + Scosha Cloudinary keys
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Default Super Admin: `admin@scosha.com` / `Admin@123`

Catalog helpers (Scosha DB only):

```bash
npm run import:scosha
npm run rewrite:sco-codes
npm run migrate:images
```

## Docs

- Deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)
- API overview: [API.md](./API.md)
- Swagger: http://localhost:5000/api/docs
- Postman: `postman/SCOSHA_API.postman_collection.json`
