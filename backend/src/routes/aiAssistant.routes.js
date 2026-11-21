const express = require('express');
const aiAssistantController = require('../controllers/aiAssistant.controller');
const { optionalAuth } = require('../middlewares/auth');
const { aiAssistantLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.get('/status', optionalAuth, aiAssistantController.getStatus);
router.post(
  '/analyze',
  optionalAuth,
  aiAssistantLimiter,
  aiAssistantController.uploadMiddleware,
  aiAssistantController.analyze
);
router.post(
  '/try-on',
  optionalAuth,
  aiAssistantLimiter,
  aiAssistantController.uploadTryOnMiddleware,
  aiAssistantController.tryOn
);

module.exports = router;
