const searchService = require('../services/search.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const search = asyncHandler(async (req, res) => {
  const result = await searchService.search(req.query);
  return ApiResponse.success(
    res,
    { items: result.data, facets: result.facets },
    'Search results',
    200,
    result.meta
  );
});

const suggestions = asyncHandler(async (req, res) => {
  const data = await searchService.suggestions(req.query.q, req.query.limit);
  return ApiResponse.success(res, data, 'Suggestions fetched');
});

module.exports = {
  search,
  suggestions,
};
