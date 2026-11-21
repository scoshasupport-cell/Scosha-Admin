/**
 * Re-upload Scosha product/variant HTTP images into Scosha Cloudinary folder.
 * Uses ONLY Scosha backend/.env CLOUDINARY_* (never Amaz's runtime).
 * Idempotent: skips URLs already under /scosha/.
 */
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const scoshaUrl = process.env.DATABASE_URL;
if (!scoshaUrl || !String(scoshaUrl).includes("/scosha")) {
  console.error("Refuse: DATABASE_URL must target scosha DB");
  process.exit(1);
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const folderRoot = (process.env.CLOUDINARY_FOLDER || "scosha").replace(/\/+$/, "");

if (!cloudName || !apiKey || !apiSecret) {
  console.error("Refuse: set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET in Scosha backend/.env");
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

const prisma = new PrismaClient({ datasources: { db: { url: scoshaUrl } } });
const CONCURRENCY = Number(process.env.CLOUDINARY_MIGRATE_CONCURRENCY || 4);
const DRY = process.env.DRY_RUN === "1";

function isHttp(u) {
  return typeof u === "string" && /^https?:\/\//i.test(u);
}

/** True only when URL is already on THIS Scosha Cloudinary cloud + folder. */
function alreadyOnScoshaCloud(u) {
  if (typeof u !== "string" || !u.includes("res.cloudinary.com")) return false;
  const onThisCloud =
    u.includes(`res.cloudinary.com/${cloudName}/`) ||
    u.includes(`res.cloudinary.com/${encodeURIComponent(cloudName)}/`);
  if (!onThisCloud) return false;
  return u.includes(`/${folderRoot}/`) || u.includes(`/${encodeURIComponent(folderRoot)}/`);
}

function publicIdFor(url) {
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  let ext = "jpg";
  try {
    const p = new URL(url).pathname;
    const m = p.match(/\.([a-zA-Z0-9]{3,4})(?:$|\?)/);
    if (m) ext = m[1].toLowerCase().replace("jpeg", "jpg");
  } catch {
    /* ignore */
  }
  return `${folderRoot}/products/${hash}`;
}

const cache = new Map(); // oldUrl -> newUrl

async function uploadOne(url) {
  if (cache.has(url)) return cache.get(url);
  if (alreadyOnScoshaCloud(url)) {
    cache.set(url, url);
    return url;
  }
  if (DRY) {
    const fake = `https://res.cloudinary.com/${cloudName}/image/upload/${publicIdFor(url)}.jpg`;
    cache.set(url, fake);
    return fake;
  }
  const public_id = publicIdFor(url);
  const res = await cloudinary.uploader.upload(url, {
    public_id,
    overwrite: true,
    invalidate: true,
    resource_type: "image",
    folder: undefined, // public_id already includes folder
  });
  const next = res.secure_url || res.url;
  cache.set(url, next);
  return next;
}

async function mapList(list) {
  if (!Array.isArray(list) || !list.length) return list;
  const out = [];
  for (const item of list) {
    if (!isHttp(item)) {
      out.push(item);
      continue;
    }
    try {
      out.push(await uploadOne(item));
    } catch (err) {
      console.warn("upload failed, keeping original:", String(item).slice(0, 80), err.message);
      out.push(item);
    }
  }
  return out;
}

async function mapPool(items, worker) {
  let i = 0;
  const results = new Array(items.length);
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => run()));
  return results;
}

async function main() {
  console.log("Cloudinary cloud:", cloudName);
  console.log("Folder root:", folderRoot);
  console.log("DB:", scoshaUrl.replace(/:[^:@]+@/, ":***@"));
  console.log("DRY_RUN:", DRY, "CONCURRENCY:", CONCURRENCY);

  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      images: true,
      variants: { select: { id: true, images: true } },
    },
    orderBy: { id: "asc" },
  });

  const httpUrls = new Set();
  for (const p of products) {
    for (const u of p.images || []) if (isHttp(u)) httpUrls.add(u);
    for (const v of p.variants) {
      for (const u of v.images || []) if (isHttp(u)) httpUrls.add(u);
    }
  }
  console.log("Products:", products.length, "unique HTTP urls:", httpUrls.size);

  const urls = [...httpUrls];
  let done = 0;
  let failed = 0;
  await mapPool(urls, async (url) => {
    try {
      await uploadOne(url);
    } catch (err) {
      failed += 1;
      cache.set(url, url); // keep original if Cloudinary cannot fetch
      if (failed <= 15) {
        console.warn("skip upload:", String(url).slice(0, 90), "-", err.message || err);
      }
    }
    done += 1;
    if (done % 25 === 0 || done === urls.length) {
      console.log(`processed ${done}/${urls.length} (failed=${failed})`);
    }
  });

  let productsUpdated = 0;
  let variantsUpdated = 0;

  for (const p of products) {
    const nextImages = await mapList(p.images || []);
    const imagesChanged = JSON.stringify(nextImages) !== JSON.stringify(p.images || []);
    if (imagesChanged) {
      await prisma.product.update({
        where: { id: p.id },
        data: { images: nextImages },
      });
      productsUpdated += 1;
    }
    for (const v of p.variants) {
      const nextV = await mapList(v.images || []);
      if (JSON.stringify(nextV) !== JSON.stringify(v.images || [])) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: { images: nextV },
        });
        variantsUpdated += 1;
      }
    }
    if ((productsUpdated + variantsUpdated) % 40 === 0 && productsUpdated) {
      console.log(`db updates… products=${productsUpdated} variants=${variantsUpdated}`);
    }
  }

  // Brand / category / collection images
  for (const model of ["brand", "category", "collection"]) {
    const rows = await prisma[model].findMany();
    for (const row of rows) {
      const data = {};
      if (isHttp(row.logo)) data.logo = await uploadOne(row.logo).catch(() => row.logo);
      if (isHttp(row.banner)) data.banner = await uploadOne(row.banner).catch(() => row.banner);
      if (isHttp(row.image)) data.image = await uploadOne(row.image).catch(() => row.image);
      if (Object.keys(data).length) {
        await prisma[model].update({ where: { id: row.id }, data });
      }
    }
  }

  console.log("Done.", {
    cacheSize: cache.size,
    productsUpdated,
    variantsUpdated,
    sample: [...cache.entries()].slice(0, 2).map(([from, to]) => ({
      from: from.slice(0, 90),
      to: String(to).slice(0, 90),
    })),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
