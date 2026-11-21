const express = require('express');
const adminAuthController = require('../../controllers/adminAuth.controller');
const { validate } = require('../../middlewares/validate');
const { authenticateAdmin } = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rateLimiter');
const { loginSchema, changePasswordSchema } = require('../../validators/auth.validator');

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), adminAuthController.login);
router.post('/refresh', adminAuthController.refresh);
router.post('/logout', authenticateAdmin, adminAuthController.logout);
router.get('/me', authenticateAdmin, adminAuthController.me);
router.post(
  '/change-password',
  authenticateAdmin,
  validate(changePasswordSchema),
  adminAuthController.changePassword
);

module.exports = router;
