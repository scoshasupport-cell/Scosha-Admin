/**
 * Rewrite Amaz/Pupasita product codes → Scosha (SCO) in DB:
 * - product.slug:  …-ama-clo-0053 / …-pup-clo-053 → …-sco-clo-0053
 * - specs.SKU:     AMA-CLO-0053 / PUP-CLO-0053 → SCO-CLO-0053
 * - variant.sku:   same prefix rewrite
 * - seoTitle / seoDescription: ama/pup → sco wording
 *
 * Usage: node src/scripts/rewrite-product-codes-sco.js
 */
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

function toScoSlug(slug) {
  let s = String(slug || '');
  // Collapse accidental double tails like …-sco-053-sco-053
  s = s.replace(/-(?:ama|pup|sco)-(\d+)(?:-(?:ama|pup|sco)-\d+)+\s*$/i, '-sco-clo-$1');
  // Catalog tail ama/pup/sco-KIND-NUM → sco-KIND-padded
  s = s.replace(/-(?:ama|pup|sco)-([a-z]+)-(\d+)\s*$/i, (_, kind, num) => {
    return `-sco-${kind.toLowerCase()}-${String(num).padStart(4, '0')}`;
  });
  // Any remaining ama/pup segment prefixes
  s = s.replace(/-(ama|pup)(?=-)/gi, '-sco');
  return s;
}

function toScoSku(sku) {
  return String(sku || '')
    .replace(/^(PUP|AMA)-/i, 'SCO-')
    .replace(/^(pup|ama)(?=-)/i, 'SCO');
}

function scrubText(value) {
  if (value == null || typeof value !== 'string') return value;
  return value
    .replace(/\bAMA-/gi, 'SCO-')
    .replace(/\bPUP-/gi, 'SCO-')
    .replace(/\bama\b/gi, 'Scosha')
    .replace(/\bpupasita\b/gi, 'Scosha');
}

async function uniqueScoSlug(desired, excludeId) {
  let candidate = desired;
  let n = 2;
  while (true) {
    const hit = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!hit || hit.id === excludeId) return candidate;
    candidate = `${desired}-${n}`;
    n += 1;
  }
}

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      specs: true,
      seoTitle: true,
      seoDescription: true,
      name: true,
      description: true,
    },
  });

  let slugUpdated = 0;
  let skuUpdated = 0;
  let metaUpdated = 0;

  for (const p of products) {
    const nextSlug = await uniqueScoSlug(toScoSlug(p.slug), p.id);
    const data = {};

    if (nextSlug !== p.slug) {
      data.slug = nextSlug;
      slugUpdated += 1;
    }

    if (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs)) {
      const specs = { ...p.specs };
      let dirty = false;
      if (specs.SKU) {
        const next = toScoSku(specs.SKU);
        if (next !== specs.SKU) {
          specs.SKU = next;
          dirty = true;
          skuUpdated += 1;
        }
      }
      for (const [k, v] of Object.entries(specs)) {
        if (typeof v === 'string') {
          const scrubbed = scrubText(v);
          if (scrubbed !== v) {
            specs[k] = scrubbed;
            dirty = true;
          }
        }
      }
      if (dirty) data.specs = specs;
    }

    const seoTitle = scrubText(p.seoTitle);
    const seoDescription = scrubText(p.seoDescription);
    const name = scrubText(p.name);
    const description = scrubText(p.description);
    if (seoTitle !== p.seoTitle) {
      data.seoTitle = seoTitle;
      metaUpdated += 1;
    }
    if (seoDescription !== p.seoDescription) data.seoDescription = seoDescription;
    if (name !== p.name) data.name = name;
    if (description !== p.description) data.description = description;

    if (Object.keys(data).length) {
      await prisma.product.update({ where: { id: p.id }, data });
    }
  }

  const variants = await prisma.productVariant.findMany({
    select: { id: true, sku: true },
  });
  let variantUpdated = 0;
  for (const v of variants) {
    const next = toScoSku(v.sku);
    if (next !== v.sku) {
      try {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: { sku: next },
        });
        variantUpdated += 1;
      } catch (err) {
        // Unique collision — append id
        await prisma.productVariant.update({
          where: { id: v.id },
          data: { sku: `${next}-${v.id}` },
        });
        variantUpdated += 1;
      }
    }
  }

  // Brand Amaz → Scosha if present
  const amazBrand = await prisma.brand.findFirst({
    where: { OR: [{ slug: 'amaz' }, { name: 'AMAZ' }, { name: 'Amaz' }] },
  });
  if (amazBrand) {
    const existingSco = await prisma.brand.findFirst({ where: { slug: 'scosha' } });
    if (!existingSco) {
      await prisma.brand.update({
        where: { id: amazBrand.id },
        data: { name: 'Scosha', slug: 'scosha' },
      });
      console.log('Renamed brand Amaz → Scosha');
    } else if (existingSco.id !== amazBrand.id) {
      await prisma.product.updateMany({
        where: { brandId: amazBrand.id },
        data: { brandId: existingSco.id },
      });
      console.log('Reassigned Amaz-branded products → Scosha brand');
    }
  }

  console.log({
    products: products.length,
    slugUpdated,
    skuUpdated,
    metaUpdated,
    variantUpdated,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
