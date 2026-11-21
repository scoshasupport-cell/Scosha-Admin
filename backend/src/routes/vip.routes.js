const express = require('express');
const vipController = require('../controllers/vip.controller');
const { validate } = require('../middlewares/validate');
const { authenticateCustomer, requireEmailVerified } = require('../middlewares/auth');
const { vipCheckLimiter } = require('../middlewares/rateLimiter');
const { z } = require('zod');

const router = express.Router();

const checkBody = z.object({
  email: z.string().email().max(255),
});

router.post('/check', vipCheckLimiter, validate(checkBody), vipController.checkEmail);
router.get('/me', authenticateCustomer, vipController.myStatus);
router.post(
  '/congrats/ack',
  authenticateCustomer,
  requireEmailVerified,
  vipController.acknowledgeCongrats
);

module.exports = router;
