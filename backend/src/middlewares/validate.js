const { ApiError } = require('../utils/ApiError');

/**
 * Zod validation middleware.
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.') || source,
        message: e.message,
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }

    req[source] = result.data;
    return next();
  };
}

/**
 * Validate multiple request parts in one pass.
 * @param {{ body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schemas
 */
function validateRequest(schemas = {}) {
  return (req, _res, next) => {
    const collectedErrors = [];

    for (const key of ['body', 'query', 'params']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key]);
      if (!result.success) {
        collectedErrors.push(
          ...result.error.errors.map((e) => ({
            field: `${key}.${e.path.join('.')}`,
            message: e.message,
          }))
        );
      } else {
        req[key] = result.data;
      }
    }

    if (collectedErrors.length) {
      return next(ApiError.badRequest('Validation failed', collectedErrors));
    }

    return next();
  };
}

module.exports = {
  validate,
  validateRequest,
};
