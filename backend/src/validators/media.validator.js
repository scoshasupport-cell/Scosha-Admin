const { z } = require('zod');
const { objectId, paginationQuery, idParams } = require('./brand.validator');

const mediaQuery = paginationQuery.extend({
  folder: z.string().optional(),
  uploadedBy: objectId.optional(),
});

module.exports = {
  mediaQuery,
  idParams,
};
