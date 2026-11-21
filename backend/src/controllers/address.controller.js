const addressService = require('../services/address.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const list = asyncHandler(async (req, res) => {
  const addresses = await addressService.list(req.user.id);
  return ApiResponse.success(res, addresses, 'Addresses fetched');
});

const getById = asyncHandler(async (req, res) => {
  const address = await addressService.getById(req.user.id, req.params.id);
  return ApiResponse.success(res, address, 'Address fetched');
});

const create = asyncHandler(async (req, res) => {
  const address = await addressService.create(req.user.id, req.body);
  return ApiResponse.created(res, address, 'Address created');
});

const update = asyncHandler(async (req, res) => {
  const address = await addressService.update(req.user.id, req.params.id, req.body);
  return ApiResponse.success(res, address, 'Address updated');
});

const setDefault = asyncHandler(async (req, res) => {
  const address = await addressService.setDefault(req.user.id, req.params.id);
  return ApiResponse.success(res, address, 'Default address updated');
});

const remove = asyncHandler(async (req, res) => {
  const address = await addressService.remove(req.user.id, req.params.id);
  return ApiResponse.success(res, address, 'Address deleted');
});

module.exports = {
  list,
  getById,
  create,
  update,
  setDefault,
  remove,
};
