const cartService = require('../services/cart.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { clearGuestSession, readSessionId } = require('../middlewares/guestSession');

function ownerFromReq(req) {
  const userId = req.user?.id ? Number(req.user.id) : null;
  // Authenticated carts are strictly user-scoped — never mix guest session in.
  if (userId && Number.isInteger(userId) && userId > 0) {
    return { userId, guestSessionId: null };
  }
  return {
    userId: null,
    guestSessionId: req.guestSessionId || null,
  };
}

const getCart = asyncHandler(async (req, res) => {
  const { userId, guestSessionId } = ownerFromReq(req);
  const cart = await cartService.getCart(userId, guestSessionId);
  return ApiResponse.success(res, cart, 'Cart fetched');
});

const addItem = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(ownerFromReq(req), req.body);
  return ApiResponse.success(res, cart, 'Item added to cart');
});

const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItem(
    ownerFromReq(req),
    req.params.itemId,
    req.body.quantity
  );
  return ApiResponse.success(res, cart, 'Cart item updated');
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(ownerFromReq(req), req.params.itemId);
  return ApiResponse.success(res, cart, 'Cart item removed');
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(ownerFromReq(req));
  return ApiResponse.success(res, cart, 'Cart cleared');
});

const mergeCart = asyncHandler(async (req, res) => {
  // Authenticated requests clear req.guestSessionId in ensureGuestSession; decode
  // the signed cookie directly so guest → user cart merge still finds the guest cart.
  const guestSessionId = readSessionId(req);
  const cart = await cartService.mergeGuestCart(req.user.id, guestSessionId);
  if (guestSessionId) clearGuestSession(res);
  return ApiResponse.success(res, cart, 'Guest cart merged');
});

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
};
