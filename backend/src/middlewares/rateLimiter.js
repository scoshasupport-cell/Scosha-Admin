const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

/**
 * All limiters use express-rate-limit's in-memory store. Consequences, documented on purpose:
 *  - Counters are per process. With N instances behind a load balancer the effective limit is
 *    N × max unless sticky sessions route a client to one instance.
 *  - Counters reset on restart/deploy.
 *  - Keys are the client IP (`trust proxy` is 1 hop, so X-Forwarded-For from the first proxy is
 *    honoured; the real client IP must be what the proxy forwards).
 * This is adequate for a single-instance deployment. Move to a shared store only when a second
 * instance is actually deployed — see DEPLOYMENT.md.
 */
function limitMessage(message) {
  return { success: false, message, code: 'RATE_LIMITED' };
}

const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many requests, please try again later'),
});

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many auth attempts, please try again later'),
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.OTP_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // Prefer email so one noisy IP/tests do not block every customer,
  // and one inbox cannot spam OTP endlessly.
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      return `otp:${email.toLowerCase().trim()}`;
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  },
  message: limitMessage('Too many OTP requests, please try again later'),
});

const vipCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      return `vip-check:${email.toLowerCase().trim()}`;
    }
    return `vip-check-ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  },
  message: limitMessage('Too many VIP checks, please try again later'),
});

const aiAssistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many AI scan requests, please try again later'),
});

module.exports = {
  generalLimiter,
  authLimiter,
  otpLimiter,
  vipCheckLimiter,
  aiAssistantLimiter,
};
