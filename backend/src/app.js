const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const swaggerUi = require('swagger-ui-express');

const { env } = require('./config/env');
const { swaggerSpec } = require('./config/swagger');
const { generalLimiter } = require('./middlewares/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { optionalAuth } = require('./middlewares/auth');
const { csrfGuard } = require('./middlewares/csrf');
const { ensureGuestSession } = require('./middlewares/guestSession');
const apiRoutes = require('./routes');
const logger = require('./utils/logger');

const app = express();

const mediaDir = path.resolve(__dirname, '../../public/media');
app.use('/media', express.static(mediaDir, { maxAge: env.isProd ? '7d' : 0, index: false }));

app.set('trust proxy', 1);

// Request id first so even body-parse and CORS failures carry one.
app.use((req, res, next) => {
  const incoming = req.get('x-request-id');
  const requestId =
    incoming && incoming.length <= 80 && /^[\w.:-]+$/.test(incoming)
      ? incoming
      : crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// Structured access log: one line per response with request id, method, path, status, duration.
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, 'request', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: req.ip,
      ...(req.user?.id ? { userId: req.user.id } : {}),
      ...(req.admin?.id ? { adminId: req.admin.id } : {}),
    });
  });
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin) || env.isDev) {
        return callback(null, true);
      }
      // Refuse the browser's cross-origin read without turning the request into a 500.
      // Cookie writes from this origin are rejected separately by csrfGuard.
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Guest-Session-Id',
      'X-Requested-With',
    ],
    exposedHeaders: ['Set-Cookie'],
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(csrfGuard);
app.use(mongoSanitize());
app.use(xss());

if (env.isDev) {
  // Human-readable console line in development; the structured log above is the source of truth.
  app.use(
    morgan('dev', {
      stream: {
        write: (message) => logger.debug(message.trim()),
      },
    })
  );
}

app.use(generalLimiter);
// Decode customer JWT (if present) before guest-session so logged-in users skip guest cookies
app.use(optionalAuth);
app.use(ensureGuestSession);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'SCOSHA E-commerce API',
    docs: '/api/docs',
    health: '/api/v1/health',
  });
});

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'SCOSHA API Docs',
  })
);

app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
