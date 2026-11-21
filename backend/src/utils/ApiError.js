const DEFAULT_CODES = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
});

class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {Array|object|null} errors field errors, or an object whose `code` names the business error
   * @param {string|null} code stable machine-readable code (e.g. OUT_OF_STOCK)
   */
  constructor(statusCode, message, errors = null, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.code =
      code ||
      (errors && !Array.isArray(errors) && typeof errors === 'object' && errors.code) ||
      DEFAULT_CODES[statusCode] ||
      'ERROR';
    this.success = false;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  withCode(code) {
    this.code = code;
    return this;
  }

  static badRequest(message = 'Bad request', errors = null, code = null) {
    return new ApiError(400, message, errors, code);
  }

  static unauthorized(message = 'Unauthorized', code = null) {
    return new ApiError(401, message, null, code);
  }

  static forbidden(message = 'Forbidden', errors = null, code = null) {
    return new ApiError(403, message, errors, code);
  }

  static notFound(message = 'Resource not found', code = null) {
    return new ApiError(404, message, null, code);
  }

  static conflict(message = 'Conflict', code = null) {
    return new ApiError(409, message, null, code);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

module.exports = { ApiError };
