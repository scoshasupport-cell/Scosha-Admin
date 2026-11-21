const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');
const { env } = require('../config/env');

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

const STATUS_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;
  let code = err instanceof ApiError && typeof err.code === 'string' ? err.code : null;

  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    errors = err.errors?.map((e) => ({
      field: e.path?.join('.') || 'unknown',
      message: e.message,
    }));
  }

  if (err instanceof ApiError && Array.isArray(errors) && message === 'Validation failed') {
    code = 'VALIDATION_ERROR';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.message || 'File upload error';
    code = 'UPLOAD_ERROR';
  }

  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
  }

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON body';
    code = 'MALFORMED_JSON';
  }

  if (statusCode >= 500 && !(err instanceof ApiError)) {
    // Never leak database or driver internals to the client.
    message = 'Internal server error';
  }

  if (!code) code = STATUS_CODES[statusCode] || 'ERROR';

  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      requestId: req.id,
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });
  } else if (env.isDev) {
    logger.warn(message, { statusCode, path: req.originalUrl });
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(req.id ? { requestId: req.id } : {}),
    ...(errors ? { errors } : {}),
    ...(env.isDev && statusCode >= 500 ? { detail: err.message, stack: err.stack } : {}),
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
