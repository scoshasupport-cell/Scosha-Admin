const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');
const { slugify } = require('../utils/slugify');

const DATA_DIR = path.join(__dirname, '../../../src/data');

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Keep frontend local image keys (e.g. "tshirt-clay") so the storefront
 * can resolve them via src/lib/images.ts local assets.
 */
function mapImageKey(key) {
  if (!key) return null;
  if (String(key).startsWith('http')) {
    // Extract local key from previous Cloudinary placeholder URLs if present
    const match = String(key).match(/\/placeholders\/([^/?#]+)/);
    if (match) return match[1];
    return key;
  }
  return key;
}

function collectProductImages(product) {
  const keys = new Set();
  if (product.image) keys.add(product.image);
  if (product.image2) keys.add(product.image2);
  (product.colors || []).forEach((color) => {
    if (color.image) keys.add(color.image);
    if (color.image2) keys.add(color.image2);
  });
  return [...keys].map(mapImageKey).filter(Boolean);
}

function flagsFromTags(tags = []) {
  const set = new Set(tags);
  return {
    newArrival: set.has('new-in'),
    bestSeller: set.has('best-sellers'),
    featured: set.has('featured'),
    trending: set.has('trending'),
  };
}

function buildVariantSku(productSlug, colorName, size) {
  const base = slugify(productSlug).toUpperCase().replace(/-/g, '');
  const color = slugify(colorName || 'default').toUpperCase().replace(/-/g, '');
  const sizePart = String(size || 'OS').toUpperCase().replace(/\s+/g, '');
  return `${base}-${color}-${sizePart}`;
}

async function migrateBrands(brands) {
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
        seoDescription: item.tagline || '',
      },
      update: {
        name: item.name,
        description: item.tagline || '',
        status: 'active',
        sortOrder: i,
        seoTitle: item.name,
        seoDescription: item.tagline || '',
      },
    });
    map.set(item.slug, doc);
  }
  logger.info(`Upserted ${map.size} brands`);
  return map;
}

async function migrateCategories(categories) {
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
      map.set(`${parent.slug}/${sub.sub || sub.slug}`, subDoc);
    }
  }

  logger.info(
    `Upserted ${[...map.keys()].filter((k) => !k.includes('/')).length} categories (incl. children)`
  );
  return map;
}

async function migrateCollections(collections) {
  const map = new Map();
  const featuredSlugs = new Set(['new-in', 'best-sellers', 'sale']);

  for (let i = 0; i < collections.length; i += 1) {
    const item = collections[i];
    const doc = await prisma.collection.upsert({
      where: { slug: item.slug },
      create: {
        title: item.title,
        slug: item.slug,
        subtitle: item.subtitle || '',
        image: mapImageKey(item.image),
        featured: featuredSlugs.has(item.slug),
        seasonal: false,
        status: 'active',
        sortOrder: i,
        seoTitle: item.title,
        seoDescription: item.subtitle || '',
      },
      update: {
        title: item.title,
        subtitle: item.subtitle || '',
        image: mapImageKey(item.image),
        featured: featuredSlugs.has(item.slug),
        seasonal: false,
        status: 'active',
        sortOrder: i,
        seoTitle: item.title,
        seoDescription: item.subtitle || '',
      },
    });
    map.set(item.slug, doc);
  }

  logger.info(`Upserted ${map.size} collections`);
  return map;
}

async function migrateProducts(products, brandMap, categoryMap, collectionMap) {
  let created = 0;
  let variantsCreated = 0;
  const collectionProductIds = new Map();

  for (const item of products) {
    const brand = brandMap.get(item.brand);
    if (!brand) {
      logger.warn(`Skipping product ${item.slug}: brand ${item.brand} not found`);
      continue;
    }

    const category = categoryMap.get(item.category);
    if (!category) {
      logger.warn(`Skipping product ${item.slug}: category ${item.category} not found`);
      continue;
    }

    const subKey = `${item.category}/${item.subcategory}`;
    const subCategory =
      categoryMap.get(subKey) ||
      categoryMap.get(`${item.category}-${item.subcategory}`) ||
      null;

    const flags = flagsFromTags(item.tags || []);
    const images = collectProductImages(item);

    const collectionIds = [];
    for (const tag of item.tags || []) {
      const col = collectionMap.get(tag);
      if (col) collectionIds.push(col.id);
    }
    const catCol = collectionMap.get(item.category);
    if (catCol) collectionIds.push(catCol.id);
    const subCol = collectionMap.get(`${item.category}-${item.subcategory}`);
    if (subCol) collectionIds.push(subCol.id);

    const collectionIdSet = [...new Set(collectionIds)];

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
        comparePrice: item.compareAt || null,
        images,
        tags: item.tags || [],
        status: 'active',
        ...flags,
        badge: item.badge || null,
        ratingAvg: item.rating || 0,
        reviewCount: item.reviews || 0,
        seoTitle: item.name,
        seoDescription: item.description?.slice(0, 160) || '',
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
        comparePrice: item.compareAt || null,
        images,
        tags: item.tags || [],
        status: 'active',
        ...flags,
        badge: item.badge || null,
        ratingAvg: item.rating || 0,
        reviewCount: item.reviews || 0,
        seoTitle: item.name,
        seoDescription: item.description?.slice(0, 160) || '',
        seoKeywords: item.tags || [],
      },
    });
    created += 1;

    await prisma.productCollection.deleteMany({ where: { productId: product.id } });
    if (collectionIdSet.length) {
      await prisma.productCollection.createMany({
        data: collectionIdSet.map((collectionId) => ({
          productId: product.id,
          collectionId,
        })),
        skipDuplicates: true,
      });
    }

    for (const colId of collectionIdSet) {
      if (!collectionProductIds.has(colId)) collectionProductIds.set(colId, []);
      collectionProductIds.get(colId).push(product.id);
    }

    const colors = item.colors?.length
      ? item.colors
      : [{ name: 'Default', hex: '#999999', image: item.image, image2: item.image2 }];
    const sizes = item.sizes?.length ? item.sizes : ['OS'];

    await prisma.productVariant.deleteMany({ where: { productId: product.id } });

    const variantDocs = [];
    for (const color of colors) {
      for (const size of sizes) {
        const sku = buildVariantSku(item.slug, color.name, size);
        const colorImages = [color.image, color.image2].map(mapImageKey).filter(Boolean);
        variantDocs.push({
          productId: product.id,
          colorName: color.name,
          colorHex: color.hex || null,
          size,
          sku,
          price: item.price,
          comparePrice: item.compareAt || null,
          stock: item.inStock === false ? 0 : 50,
          images: colorImages.length ? colorImages : images.slice(0, 2),
          status: 'active',
        });
      }
    }

    if (variantDocs.length) {
      try {
        await prisma.productVariant.createMany({
          data: variantDocs,
          skipDuplicates: true,
        });
        variantsCreated += variantDocs.length;
      } catch (error) {
        for (const doc of variantDocs) {
          await prisma.productVariant.upsert({
            where: { sku: doc.sku },
            create: doc,
            update: doc,
          });
          variantsCreated += 1;
        }
        logger.warn(`Variant bulk insert fallback for ${item.slug}: ${error.message}`);
      }
    }
  }

  logger.info(`Upserted ${created} products and ${variantsCreated} variants`);
  logger.info(`Linked products across ${collectionProductIds.size} collections`);
  return { created, variantsCreated };
}

async function migrateCatalog() {
  logger.info('Starting catalog migration...');
  logger.info(`Reading catalog JSON from ${DATA_DIR}`);

  const brands = readJson('brands.json');
  const categories = readJson('categories.json');
  const collections = readJson('collections.json');
  const products = readJson('products.json');

  const brandMap = await migrateBrands(brands);
  const categoryMap = await migrateCategories(categories);
  const collectionMap = await migrateCollections(collections);
  const productStats = await migrateProducts(products, brandMap, categoryMap, collectionMap);

  logger.info('Catalog migration complete', {
    brands: brandMap.size,
    categories: [...categoryMap.keys()].filter((k) => !k.includes('/')).length,
    collections: collectionMap.size,
    products: productStats.created,
    variants: productStats.variantsCreated,
    environment: env.NODE_ENV,
  });

  await prisma.$disconnect();
  logger.info('Catalog migration finished');
}

migrateCatalog().catch(async (error) => {
  logger.error('Catalog migration failed', { message: error.message, stack: error.stack });
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
