const { prisma } = require('../config/prisma');
const cartService = require('./cart.service');
const { ApiError } = require('../utils/ApiError');
const { parseId, mapProduct } = require('../utils/prismaHelpers');

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  images: true,
  basePrice: true,
  comparePrice: true,
  status: true,
  badge: true,
  ratingAvg: true,
  reviewCount: true,
  brandId: true,
  categoryId: true,
};

async function findOrCreateWishlist(userId) {
  const uid = parseId(userId);
  let wishlist = await prisma.wishlist.findUnique({
    where: { userId: uid },
    include: { items: true },
  });
  if (wishlist) return wishlist;

  try {
    wishlist = await prisma.wishlist.create({
      data: { userId: uid },
      include: { items: true },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      wishlist = await prisma.wishlist.findUnique({
        where: { userId: uid },
        include: { items: true },
      });
      if (wishlist) return wishlist;
    }
    throw error;
  }
  return wishlist;
}

async function populateWishlist(wishlist) {
  if (!wishlist) {
    return { productIds: [], products: [], count: 0 };
  }

  const items = await prisma.wishlistItem.findMany({
    where: { wishlistId: wishlist.id },
    include: {
      product: { select: PRODUCT_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  const products = items
    .map((item) => item.product)
    .filter((p) => p && p.status === 'active')
    .map(mapProduct);

  return {
    id: wishlist.id,
    userId: wishlist.userId,
    products,
    productIds: products.map((p) => p.id),
    count: products.length,
    createdAt: wishlist.createdAt,
    updatedAt: wishlist.updatedAt,
  };
}

async function getWishlist(userId) {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: parseId(userId) },
  });
  return populateWishlist(wishlist);
}

async function addProduct(userId, productId) {
  const pid = parseId(productId);
  const product = await prisma.product.findUnique({ where: { id: pid } });
  if (!product || product.status !== 'active') {
    throw ApiError.notFound('Product not found');
  }

  const wishlist = await findOrCreateWishlist(userId);
  const exists = wishlist.items.some((item) => item.productId === pid);
  if (!exists) {
    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: pid,
      },
    });
  }

  return populateWishlist(wishlist);
}

async function removeProduct(userId, productId) {
  const uid = parseId(userId);
  const pid = parseId(productId);
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: uid },
    include: { items: true },
  });
  if (!wishlist) throw ApiError.notFound('Wishlist not found');

  const item = wishlist.items.find((entry) => entry.productId === pid);
  if (!item) throw ApiError.notFound('Product not in wishlist');

  await prisma.wishlistItem.delete({ where: { id: item.id } });
  return populateWishlist(wishlist);
}

async function moveToCart(userId, productId) {
  const uid = parseId(userId);
  const pid = parseId(productId);
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: uid },
    include: { items: true },
  });
  if (!wishlist) throw ApiError.notFound('Wishlist not found');

  const item = wishlist.items.find((entry) => entry.productId === pid);
  if (!item) throw ApiError.notFound('Product not in wishlist');

  const product = await prisma.product.findUnique({ where: { id: pid } });
  if (!product || product.status !== 'active') {
    throw ApiError.notFound('Product not found');
  }

  const variant = await prisma.productVariant.findFirst({
    where: {
      productId: pid,
      status: 'active',
      stock: { gt: 0 },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!variant) {
    throw ApiError.badRequest('No available variant in stock for this product');
  }

  const cart = await cartService.addItem(
    { userId: uid, guestSessionId: null },
    {
      variantId: variant.id,
      quantity: 1,
    }
  );

  await prisma.wishlistItem.delete({ where: { id: item.id } });

  const populatedWishlist = await populateWishlist(wishlist);
  return { cart, wishlist: populatedWishlist, variantId: variant.id };
}

module.exports = {
  getWishlist,
  addProduct,
  removeProduct,
  moveToCart,
};
