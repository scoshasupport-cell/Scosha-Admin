const winston = require('winston');
const { env } = require('../config/env');

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

const consoleFormat = printf(({ timestamp: ts, level, message, stack, ...meta }) => {
  const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const base = `${ts} [${level}]: ${stack || message}${rest}`;
  return base;
});

const logger = winston.createLogger({
  level: env.LOG_LEVEL || (env.isProd ? 'info' : 'debug'),
  defaultMeta: { service: 'scosha-api' },
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: !env.isProd }),
        timestamp(),
        errors({ stack: true }),
        consoleFormat
      ),
    }),
  ],
});

module.exports = logger;
