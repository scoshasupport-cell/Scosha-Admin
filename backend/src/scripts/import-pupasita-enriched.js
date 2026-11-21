/**
 * Import catalog from backend/src/scripts/data/pupasita-enriched.json
 * Use when the full clothes/furniture sibling JSON folders are unavailable.
 * Prefer restoring a mysqldump of the full local `scosha` DB when possible.
 */
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { prisma } = require('../config/prisma');
const { slugify } = require('../utils/slugify');
const { loadPupasitaEnrichedCatalog } = require('./lib/scoshaCatalog');

const STOREFRONT_DATA = path.resolve(__dirname, '../../../src/data');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 1)}\n`, 'utf8');
}

function buildVariantSku(productSlug, colorName, size) {
  const base = slugify(productSlug).toUpperCase().replace(/-/g, '').slice(0, 24);
  const color = slugify(colorName || 'default')
    .toUpperCase()
    .replace(/-/g, '')
    .slice(0, 12);
  const sizePart = String(size || 'OS')
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 12);
  return `${base}-${color}-${sizePart}`.slice(0, 64);
}

async function upsertDepartments(categories) {
  const map = new Map();
  for (let i = 0; i < categories.length; i += 1) {
    const cat = categories[i];
    const parentDoc = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        name: cat.name,
        slug: cat.slug,
        parentId: null,
        description: `${cat.name} products`,
        sortOrder: cat.sortOrder ?? i,
        status: 'active',
        seoTitle: cat.name,
      },
      update: {
        name: cat.name,
        parentId: null,
        status: 'active',
        sortOrder: cat.sortOrder ?? i,
        seoTitle: cat.name,
      },
    });
    map.set(cat.slug, parentDoc);

    const subs = cat.subcategories || [];
    for (let j = 0; j < subs.length; j += 1) {
      const sub = subs[j];
      const subDoc = await prisma.category.upsert({
        where: { slug: sub.slug },
        create: {
          name: sub.name,
          slug: sub.slug,
          parentId: parentDoc.id,
          sortOrder: j,
          status: 'active',
          seoTitle: `${cat.name} ${sub.name}`,
        },
        update: {
          name: sub.name,
          parentId: parentDoc.id,
          status: 'active',
          sortOrder: j,
          seoTitle: `${cat.name} ${sub.name}`,
        },
      });
      map.set(sub.slug, subDoc);
      if (sub.sub) {
        map.set(`${cat.slug}/${sub.sub}`, subDoc);
        map.set(`${cat.slug}-${sub.sub}`, subDoc);
      }
    }
  }
  return map;
}

async function upsertBrands(brands) {
  const map = new Map();
  for (let i = 0; i < brands.length; i += 1) {
    const brand = brands[i];
    const doc = await prisma.brand.upsert({
      where: { slug: brand.slug },
      create: {
        name: brand.name,
        slug: brand.slug,
        description: brand.tagline || brand.name,
        status: 'active',
        sortOrder: i,
        seoTitle: brand.name,
      },
      update: {
        name: brand.name,
        description: brand.tagline || brand.name,
        status: 'active',
        sortOrder: i,
      },
    });
    map.set(brand.slug, doc);
  }
  return map;
}

async function upsertCollections(collections) {
  const map = new Map();
  for (let i = 0; i < collections.length; i += 1) {
    const col = collections[i];
    const doc = await prisma.collection.upsert({
      where: { slug: col.slug },
      create: {
        title: col.title,
        slug: col.slug,
        subtitle: col.subtitle || '',
        image: col.image || null,
        featured: ['new-in', 'clothes', 'furniture'].includes(col.slug),
        status: 'active',
        sortOrder: i,
        seoTitle: col.title,
      },
      update: {
        title: col.title,
        subtitle: col.subtitle || '',
        image: col.image || null,
        featured: ['new-in', 'clothes', 'furniture'].includes(col.slug),
        status: 'active',
        sortOrder: i,
      },
    });
    map.set(col.slug, doc);
  }
  return map;
}

async function upsertProducts(products, brandMap, categoryMap, collectionMap) {
  let count = 0;
  let variants = 0;

  for (const item of products) {
    const brand = brandMap.get(item.brand);
    const category = categoryMap.get(item.category);
    if (!brand || !category) {
      logger.warn(`Skip ${item.slug}: missing brand/category`);
      continue;
    }

    const subCategory =
      categoryMap.get(`${item.category}/${item.subcategory}`) ||
      categoryMap.get(`${item.category}-${item.subcategory}`) ||
      null;

    const images = [item.image, item.image2, ...(item.colors || []).flatMap((c) => [c.image, c.image2])]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 12);

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description || '',
        details: item.details || [],
        specs: item.specs || {},
        brandId: brand.id,
        categoryId: category.id,
        subCategoryId: subCategory?.id || null,
        basePrice: item.price,
        comparePrice: item.compareAt,
        images,
        tags: item.tags || [],
        status: 'active',
        newArrival: true,
        featured: count < 12,
        badge: item.badge,
        seoTitle: item.name.slice(0, 70),
        seoDescription: (item.description || '').slice(0, 160),
        seoKeywords: item.tags || [],
      },
      update: {
        name: item.name,
        description: item.description || '',
        details: item.details || [],
        specs: item.specs || {},
        brandId: brand.id,
        categoryId: category.id,
        subCategoryId: subCategory?.id || null,
        basePrice: item.price,
        comparePrice: item.compareAt,
        images,
        tags: item.tags || [],
        status: 'active',
        newArrival: true,
        badge: item.badge,
        seoTitle: item.name.slice(0, 70),
        seoDescription: (item.description || '').slice(0, 160),
        seoKeywords: item.tags || [],
      },
    });
    count += 1;

    const collectionIds = [
      collectionMap.get('new-in')?.id,
      collectionMap.get('all')?.id,
      collectionMap.get(item.category)?.id,
      collectionMap.get(`${item.category}-${item.subcategory}`)?.id,
    ].filter(Boolean);

    await prisma.productCollection.deleteMany({ where: { productId: product.id } });
    if (collectionIds.length) {
      await prisma.productCollection.createMany({
        data: [...new Set(collectionIds)].map((collectionId) => ({
          productId: product.id,
          collectionId,
        })),
        skipDuplicates: true,
      });
    }

    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    const colors = item.colors?.length
      ? item.colors
      : [{ name: 'Default', hex: '#888888', image: item.image, image2: item.image2 }];
    const sizes = item.sizes?.length ? item.sizes : ['OS'];
    const stockPerVariant = Math.max(
      0,
      Math.floor((item.stock || 0) / (colors.length * sizes.length)) || item.stock || 0
    );

    for (const color of colors) {
      for (const size of sizes) {
        const doc = {
          productId: product.id,
          colorName: color.name,
          colorHex: color.hex || null,
          size: String(size).slice(0, 40),
          sku: buildVariantSku(item.sku || item.slug, color.name, size),
          price: item.price,
          comparePrice: item.compareAt,
          stock: stockPerVariant,
          images: [color.image, color.image2].filter(Boolean).slice(0, 4),
          status: 'active',
        };
        await prisma.productVariant.upsert({
          where: { sku: doc.sku },
          create: doc,
          update: {
            productId: doc.productId,
            colorName: doc.colorName,
            colorHex: doc.colorHex,
            size: doc.size,
            price: doc.price,
            comparePrice: doc.comparePrice,
            stock: doc.stock,
            images: doc.images,
            status: 'active',
          },
        });
        variants += 1;
      }
    }
  }

  return { count, variants };
}

function writeStorefrontData(catalog) {
  const productsForStore = catalog.products.map((p) => {
    const { stock, source, pricingMeta, sku, ...rest } = p;
    return rest;
  });

  writeJson(path.join(STOREFRONT_DATA, 'products.json'), productsForStore);
  writeJson(path.join(STOREFRONT_DATA, 'brands.json'), catalog.brands);
  writeJson(path.join(STOREFRONT_DATA, 'categories.json'), catalog.categories);
  writeJson(
    path.join(STOREFRONT_DATA, 'collections.json'),
    catalog.collections.map((c) => ({
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle || '',
      image: c.image || '',
      count: c.count || 0,
    }))
  );
}

async function importPupasita() {
  logger.info('Starting Pupasita enriched catalog import...');
  const catalog = loadPupasitaEnrichedCatalog();
  logger.info('Pupasita catalog stats', catalog.stats);

  writeStorefrontData(catalog);

  const brandMap = await upsertBrands(catalog.brands);
  const categoryMap = await upsertDepartments(catalog.categories);
  const collectionMap = await upsertCollections(catalog.collections);
  const productStats = await upsertProducts(
    catalog.products,
    brandMap,
    categoryMap,
    collectionMap
  );

  logger.info('Pupasita import complete', {
    brands: brandMap.size,
    categories: catalog.categories.length,
    products: productStats.count,
    variants: productStats.variants,
  });

  await prisma.$disconnect();
}

importPupasita().catch(async (error) => {
  logger.error('Pupasita import failed', { message: error.message, stack: error.stack });
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
