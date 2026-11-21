# SCOSHA Admin Panel

React + TypeScript admin for the **Scosha** e-commerce API (standalone — not shared with Amaz).

The admin UI is served **same-origin** under the storefront:

- Local: `http://localhost:3000/admin`
- Production: `https://your-scosha-domain.com/admin`

## Recommended local setup

From the **repo root**:

```bash
# Terminal A — Scosha API (:5000)
npm run dev:backend

# Terminal B — storefront (:3000)
npm run dev

# Terminal C — admin Vite (:5174) optional during development
npm run dev:admin
```

Or:

```bash
npm run dev:all
```

Then open:

| URL | Page |
|-----|------|
| http://localhost:3000/ | Storefront |
| http://localhost:3000/admin/login | Admin login |
| http://localhost:5000/api/v1 | Scosha API |

Default seed admin (after `npm run seed` in backend): see backend seed output / `ADMIN_EMAIL` in `.env`.

## Environment

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Point this only at the **Scosha** API — never at an Amaz backend.
