const wishlistService = require('../services/wishlist.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.getWishlist(req.user.id);
  return ApiResponse.success(res, wishlist, 'Wishlist fetched');
});

const addProduct = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.addProduct(req.user.id, req.params.productId);
  return ApiResponse.success(res, wishlist, 'Product added to wishlist');
});

const removeProduct = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.removeProduct(req.user.id, req.params.productId);
  return ApiResponse.success(res, wishlist, 'Product removed from wishlist');
});

const moveToCart = asyncHandler(async (req, res) => {
  const result = await wishlistService.moveToCart(req.user.id, req.params.productId);
  return ApiResponse.success(res, result, 'Product moved to cart');
});

module.exports = {
  getWishlist,
  addProduct,
  removeProduct,
  moveToCart,
};
