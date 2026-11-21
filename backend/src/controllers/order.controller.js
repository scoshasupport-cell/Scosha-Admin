const orderService = require('../services/order.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const previewCheckout = asyncHandler(async (req, res) => {
  const summary = await orderService.previewCheckout({
    userId: req.user.id,
    addressId: req.body.addressId,
    deliveryMethod: req.body.deliveryMethod,
    couponCode: req.body.couponCode,
  });
  return ApiResponse.success(res, summary, 'Checkout preview');
});

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder({
    userId: req.user.id,
    addressId: req.body.addressId,
    deliveryMethod: req.body.deliveryMethod,
    couponCode: req.body.couponCode,
    notes: req.body.notes,
  });
  return ApiResponse.created(res, order, 'Order placed successfully');
});

const listMyOrders = asyncHandler(async (req, res) => {
  const result = await orderService.listMyOrders(req.user.id, req.query);
  return ApiResponse.success(res, result.data, 'Orders fetched', 200, result.meta);
});

const getMyOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getMyOrder(req.user.id, req.params.id);
  return ApiResponse.success(res, order, 'Order fetched');
});

const listOrders = asyncHandler(async (req, res) => {
  const result = await orderService.listOrders(req.query);
  return ApiResponse.success(res, result.data, 'Orders fetched', 200, result.meta);
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.id);
  return ApiResponse.success(res, order, 'Order fetched');
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(
    req.params.id,
    { status: req.body.status, note: req.body.note },
    req.admin.id
  );
  return ApiResponse.success(res, order, 'Order status updated');
});

const refundOrder = asyncHandler(async (req, res) => {
  const order = await orderService.refundOrder(
    req.params.id,
    { note: req.body.note },
    req.admin.id
  );
  return ApiResponse.success(res, order, 'Order refunded');
});

const setTracking = asyncHandler(async (req, res) => {
  const order = await orderService.setTracking(
    req.params.id,
    req.body.trackingNumber,
    req.admin.id
  );
  return ApiResponse.success(res, order, 'Tracking updated');
});

const downloadPackingSlip = asyncHandler(async (req, res) => {
  const { buffer, filename, contentType } = await orderService.getPackingSlipPdf(req.params.id);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
});

module.exports = {
  previewCheckout,
  createOrder,
  listMyOrders,
  getMyOrder,
  listOrders,
  getOrder,
  updateStatus,
  refundOrder,
  setTracking,
  downloadPackingSlip,
};
