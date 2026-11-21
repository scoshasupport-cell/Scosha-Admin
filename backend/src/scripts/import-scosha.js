const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { prisma } = require('../config/prisma');
const { slugify } = require('../utils/slugify');
const { fetchEurUsdRate } = require('../utils/currency');
const { loadNormalizedCatalog } = require('./lib/scoshaCatalog');

const STOREFRONT_DATA = path.resolve(__dirname, '../../../src/data');
const MEDIA_ROOT = path.resolve(__dirname, '../../../public/media/scosha');
const CLOTHES_IMAGES = path.resolve(
  __dirname,
  '../../../../scosha clothes products/website_catalog/images'
);
const FURNITURE_IMAGES = path.resolve(__dirname, '../../../../scosha products data/images');

const LEGACY_CATEGORY_SLUGS = new Set([
  'women',
  'men',
  'kids',
  'women-t-shirts',
  'women-shirts',
  'women-hoodies',
  'women-jackets',
  'women-dresses',
  'women-jeans',
  'women-trousers',
  'women-shoes',
  'women-bags',
  'women-accessories',
  'men-t-shirts',
  'men-shirts',
  'men-hoodies',
  'men-jackets',
  'men-jeans',
  'men-trousers',
  'men-shorts',
  'men-shoes',
  'men-accessories',
  'kids-t-shirts',
  'kids-shirts',
  'kids-hoodies',
  'kids-jackets',
  'kids-jeans',
  'kids-shoes',
  'kids-accessories',
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDirIfExists(src, dest) {
  if (!fs.existsSync(src)) {
    logger.warn(`Image source missing: ${src}`);
    return 0;
  }
  ensureDir(dest);
  let count = 0;
  const walk = (from, to) => {
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const fromPath = path.join(from, entry.name);
      const toPath = path.join(to, entry.name);
      if (entry.isDirectory()) {
        ensureDir(toPath);
        walk(fromPath, toPath);
      } else {
        fs.copyFileSync(fromPath, toPath);
        count += 1;
      }
    }
  };
  walk(src, dest);
  return count;
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

async function archiveLegacyCatalog() {
  const legacyCategories = await prisma.category.findMany({
    where: { slug: { in: [...LEGACY_CATEGORY_SLUGS] } },
    select: { id: true, slug: true },
  });
  const legacyIds = legacyCategories.map((c) => c.id);

  if (legacyIds.length) {
    const archived = await prisma.product.updateMany({
      where: {
        OR: [{ categoryId: { in: legacyIds } }, { subCategoryId: { in: legacyIds } }],
      },
      data: { status: 'archived' },
    });
    await prisma.category.updateMany({
      where: { id: { in: legacyIds } },
      data: { status: 'inactive' },
    });
    logger.info(`Archived ${archived.count} legacy products; inactivated ${legacyIds.length} categories`);
  }

  // Archive leftover fashion demo products that are not tagged scosha
  const active = await prisma.product.findMany({
    where: { status: 'active' },
    select: { id: true, tags: true, slug: true },
  });
  const toArchive = active
    .filter((p) => {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return !tags.includes('scosha');
    })
    .map((p) => p.id);
  if (toArchive.length) {
    await prisma.product.updateMany({
      where: { id: { in: toArchive } },
      data: { status: 'archived' },
    });
    logger.info(`Archived ${toArchive.length} non-scosha demo products`);
  }
}

async function upsertDepartments(categories) {
  const map = new Map();
  for (let i = 0; i < categories.length; i += 1) {
    const parent = categories[i];
    const parentDoc = await prisma.category.upsert({
      where: { slug: parent.slug },
      create: {
        name: parent.name,
        slug: parent.slug,
        parentId: null,
        status: 'active',
        sortOrder: i,
        seoTitle: parent.name,
        description:
          parent.slug === 'skincare' || parent.slug === 'electronics'
            ? 'Coming Soon'
            : `${parent.name} products`,
      },
      update: {
        name: parent.name,
        parentId: null,
        status: 'active',
        sortOrder: i,
        seoTitle: parent.name,
      },
    });
    map.set(parent.slug, parentDoc);

    const subs = parent.subcategories || [];
    for (let j = 0; j < subs.length; j += 1) {
      const sub = subs[j];
      const subDoc = await prisma.category.upsert({
        where: { slug: sub.slug },
        create: {
          name: sub.name,
          slug: sub.slug,
          parentId: parentDoc.id,
          status: 'active',
          sortOrder: j,
          seoTitle: `${parent.name} ${sub.name}`,
        },
        update: {
          name: sub.name,
          parentId: parentDoc.id,
          status: 'active',
          sortOrder: j,
          seoTitle: `${parent.name} ${sub.name}`,
        },
      });
      map.set(sub.slug, subDoc);
      map.set(`${parent.slug}/${sub.sub}`, subDoc);
    }
  }
  return map;
}

async function upsertBrands(brands) {
  const map = new Map();
  for (let i = 0; i < brands.length; i += 1) {
    const item = brands[i];
    const doc = await prisma.brand.upsert({
      where: { slug: item.slug },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.tagline || '',
        status: 'active',
        sortOrder: i,
        seoTitle: item.name,
      },
      update: {
        name: item.name,
        description: item.tagline || '',
        status: 'active',
        sortOrder: i,
      },
    });
    map.set(item.slug, doc);
  }
  return map;
}

async function upsertCollections(collections) {
  const map = new Map();
  for (let i = 0; i < collections.length; i += 1) {
    const item = collections[i];
    const doc = await prisma.collection.upsert({
      where: { slug: item.slug },
      create: {
        title: item.title,
        slug: item.slug,
        subtitle: item.subtitle || '',
        image: item.image || null,
        featured: ['new-in', 'clothes', 'furniture'].includes(item.slug),
        status: 'active',
        sortOrder: i,
        seoTitle: item.title,
      },
      update: {
        title: item.title,
        subtitle: item.subtitle || '',
        image: item.image || null,
        featured: ['new-in', 'clothes', 'furniture'].includes(item.slug),
        status: 'active',
        sortOrder: i,
      },
    });
    map.set(item.slug, doc);
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
    const stockPerVariant = Math.max(0, Math.floor((item.stock || 0) / (colors.length * sizes.length)) || item.stock || 0);

    const variantDocs = [];
    for (const color of colors) {
      for (const size of sizes) {
        variantDocs.push({
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
        });
      }
    }

    for (const doc of variantDocs) {
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

  writeJson(path.join(STOREFRONT_DATA, 'scosha-import-meta.json'), {
    importedAt: new Date().toISOString(),
    stats: catalog.stats,
    eurUsd: catalog.eurUsd,
  });

  logger.info(`Wrote storefront data to ${STOREFRONT_DATA}`);
}

async function importScosha() {
  logger.info('Starting Scosha catalog import...');

  const fx = await fetchEurUsdRate();
  logger.info(`EUR/USD rate ${fx.rate} (source=${fx.source}, date=${fx.date || 'n/a'})`);

  const catalog = loadNormalizedCatalog(fx.rate);
  catalog.eurUsd = fx;
  logger.info('Normalized catalog stats', catalog.stats);

  const clothesCopied = copyDirIfExists(CLOTHES_IMAGES, path.join(MEDIA_ROOT, 'clothes'));
  const furnitureCopied = copyDirIfExists(FURNITURE_IMAGES, path.join(MEDIA_ROOT, 'furniture'));
  logger.info(`Copied media files: clothes=${clothesCopied}, furniture=${furnitureCopied}`);

  writeStorefrontData(catalog);

  await archiveLegacyCatalog();
  const brandMap = await upsertBrands(catalog.brands);
  const categoryMap = await upsertDepartments(catalog.categories);
  const collectionMap = await upsertCollections(catalog.collections);
  const productStats = await upsertProducts(
    catalog.products,
    brandMap,
    categoryMap,
    collectionMap
  );

  logger.info('Scosha import complete', {
    brands: brandMap.size,
    categories: catalog.categories.length,
    products: productStats.count,
    variants: productStats.variants,
    eurUsd: fx.rate,
  });

  await prisma.$disconnect();
}

importScosha().catch(async (error) => {
  logger.error('Scosha import failed', { message: error.message, stack: error.stack });
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
