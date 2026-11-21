const { z } = require('zod');
const { objectId } = require('./brand.validator');

const productIdParams = z.object({
  productId: objectId,
});

module.exports = {
  productIdParams,
};
