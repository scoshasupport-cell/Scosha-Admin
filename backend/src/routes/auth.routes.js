const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate');
const { authenticateCustomer } = require('../middlewares/auth');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiter');
const {
  registerSchema,
  verifyEmailSchema,
  emailSchema,
  loginSchema,
  googleSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/verify-email', otpLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-otp', otpLimiter, validate(emailSchema), authController.resendOtp);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/google', authLimiter, validate(googleSchema), authController.google);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticateCustomer, authController.logout);
router.post('/forgot-password', authLimiter, validate(emailSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', authenticateCustomer, validate(changePasswordSchema), authController.changePassword);
router.get('/me', authenticateCustomer, authController.me);

module.exports = router;
