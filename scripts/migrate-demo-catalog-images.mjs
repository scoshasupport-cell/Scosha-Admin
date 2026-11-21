/**
 * Re-upload demo-catalog.json Amaz Cloudinary images into Scosha folder and rewrite URLs.
 * Uses backend/.env CLOUDINARY_* credentials.
 */
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const require = createRequire(path.join(root, "backend", "package.json"))
require("dotenv").config({ path: path.join(root, "backend", ".env") })
const cloudinary = require("cloudinary").v2

const catalogPath = path.join(root, "lib", "demo-catalog.json")
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET
const folderRoot = (process.env.CLOUDINARY_FOLDER || "scosha").replace(/\/+$/, "")
const DRY = process.env.DRY_RUN === "1"
const CONCURRENCY = Number(process.env.CLOUDINARY_MIGRATE_CONCURRENCY || 4)

if (!cloudName || !apiKey || !apiSecret) {
  console.error("Missing CLOUDINARY_* in backend/.env")
  process.exit(1)
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })

function alreadyOnScoshaCloud(u) {
  return (
    typeof u === "string" &&
    u.includes(`res.cloudinary.com/${cloudName}/`) &&
    u.includes(`/${folderRoot}/`)
  )
}

function isHttp(u) {
  return typeof u === "string" && /^https?:\/\//i.test(u)
}

function publicIdFor(url) {
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16)
  const m = String(url).match(/\/amaz\/(winter\/[^/]+)\//i)
  const folder = m ? `${folderRoot}/${m[1]}` : `${folderRoot}/products`
  return `${folder}/${hash}`
}

const cache = new Map()
let failed = 0

async function uploadOne(url) {
  if (cache.has(url)) return cache.get(url)
  if (alreadyOnScoshaCloud(url)) {
    cache.set(url, url)
    return url
  }
  if (DRY) {
    const fake = `https://res.cloudinary.com/${cloudName}/image/upload/${publicIdFor(url)}.jpg`
    cache.set(url, fake)
    return fake
  }
  try {
    const public_id = publicIdFor(url)
    const res = await cloudinary.uploader.upload(url, {
      public_id,
      overwrite: true,
      invalidate: true,
      resource_type: "image",
    })
    const next = res.secure_url || res.url
    cache.set(url, next)
    return next
  } catch (err) {
    failed += 1
    if (failed <= 20) console.warn("upload fail:", url.slice(0, 90), err.message)
    cache.set(url, url)
    return url
  }
}

async function mapPool(urls, worker) {
  let i = 0
  const results = new Array(urls.length)
  async function run() {
    while (i < urls.length) {
      const idx = i++
      results[idx] = await worker(urls[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => run()))
  return results
}

function collectUrls(data) {
  const set = new Set()
  for (const p of data) {
    for (const u of p.images || []) if (isHttp(u)) set.add(u)
    for (const c of p.colors || []) {
      if (isHttp(c.image)) set.add(c.image)
      if (isHttp(c.image2)) set.add(c.image2)
      for (const u of c.images || []) if (isHttp(u)) set.add(u)
    }
  }
  return [...set]
}

function rewrite(data, map) {
  const swap = (u) => (typeof u === "string" && map.has(u) ? map.get(u) : u)
  for (const p of data) {
    if (Array.isArray(p.images)) p.images = p.images.map(swap)
    for (const c of p.colors || []) {
      if (c.image) c.image = swap(c.image)
      if (c.image2) c.image2 = swap(c.image2)
      if (Array.isArray(c.images)) c.images = c.images.map(swap)
    }
  }
}

const data = JSON.parse(fs.readFileSync(catalogPath, "utf8"))
const urls = collectUrls(data)
console.log("Products:", data.length, "unique HTTP urls:", urls.length, "DRY_RUN:", DRY)

let done = 0
await mapPool(urls, async (url) => {
  await uploadOne(url)
  done += 1
  if (done % 20 === 0 || done === urls.length) {
    console.log(`processed ${done}/${urls.length} (failed=${failed})`)
  }
})

rewrite(data, cache)
fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2) + "\n")
console.log("Wrote", catalogPath, "cache:", cache.size, "failed:", failed)
