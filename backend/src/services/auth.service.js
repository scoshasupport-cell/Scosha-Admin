const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { sendEmail, sendEmailAsync } = require('../config/email');
const { ApiError } = require('../utils/ApiError');
const { generateOtp } = require('../utils/otp');
const logger = require('../utils/logger');

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  generateResetToken,
} = require('../utils/tokens');
const { otpEmail } = require('../templates/otpEmail');
const { welcomeEmail } = require('../templates/welcomeEmail');
const { forgotPasswordEmail } = require('../templates/forgotPasswordEmail');

function sanitizeUser(user) {
  const obj = { ...user };
  if (obj.id != null) {
    obj.id = String(obj.id);
    obj._id = obj.id;
  }
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.otpCode;
  delete obj.otpExpiry;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpiry;
  delete obj.googleId;
  delete obj.tokenVersion;
  return obj;
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits : '';
}

async function findUserByPhone(phone, select) {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const exact = await prisma.user.findFirst({
    where: {
      OR: [{ phone: digits }, { phone: `+${digits}` }, { phone: String(phone || '').trim() }],
    },
    select,
  });
  if (exact) return exact;
  const tail = digits.slice(-8);
  const candidates = await prisma.user.findMany({
    where: { phone: { contains: tail } },
    select,
    take: 8,
  });
  const matched = candidates.filter((user) => {
    const stored = normalizePhone(user.phone);
    return stored === digits || stored.endsWith(digits) || digits.endsWith(stored);
  });
  return matched.length === 1 ? matched[0] : null;
}

async function issueCustomerTokens(user, { expectedRefreshHash } = {}) {
  const userId = Number(user.id);
  let tokenVersion = user.tokenVersion;
  if (tokenVersion == null) {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    if (!row) throw ApiError.unauthorized('User not found');
    tokenVersion = row.tokenVersion;
  }
  const payload = {
    id: String(userId),
    email: user.email || user.phone || '',
    role: 'customer',
    tv: tokenVersion,
  };
  const accessToken = generateAccessToken(payload, 'customer');
  const refreshToken = generateRefreshToken(payload, 'customer');
  const refreshTokenHash = await hashToken(refreshToken);
  const lastLogin = new Date();

  const where = { id: userId, tokenVersion };
  // Refresh rotation wins only if this request still holds the hash it verified.
  if (expectedRefreshHash) where.refreshTokenHash = expectedRefreshHash;
  const wrote = await prisma.user.updateMany({
    where,
    data: { refreshTokenHash, lastLogin },
  });
  if (wrote.count !== 1) throw ApiError.unauthorized('Session revoked');

  const updated = { refreshTokenHash, lastLogin, tokenVersion };

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser({ ...user, ...updated }),
  };
}

async function register({ name, email, phone, password, gender, preferredSize, address }) {
  const normalizedEmail = email ? String(email).toLowerCase().trim() : null;
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  if (!normalizedEmail && !normalizedPhone) {
    throw ApiError.badRequest('Email or phone is required');
  }

  if (normalizedEmail) {
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw ApiError.conflict('Email already registered');
    }
  }
  if (normalizedPhone) {
    const existingPhone = await findUserByPhone(normalizedPhone, { id: true });
    if (existingPhone) {
      throw ApiError.conflict('Phone number already registered');
    }
  }

  const customerRole = await prisma.role.findUnique({
    where: { name: 'Customer' },
  });
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  const otp = normalizedEmail ? generateOtp(6) : null;

  const genderValue =
    gender === 'women' || gender === 'men' || gender === 'unisex' ? gender : null;
  const sizeValue =
    preferredSize && String(preferredSize).trim() ? String(preferredSize).trim().slice(0, 20) : null;

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      roleId: customerRole?.id ?? null,
      isEmailVerified: false,
      otpCode: otp,
      otpExpiry: otp ? new Date(Date.now() + OTP_TTL_MS) : null,
      gender: genderValue,
      preferredSize: sizeValue,
    },
  });

  if (address?.line1 && address?.city && address?.state && address?.zip) {
    try {
      await prisma.address.create({
        data: {
          userId: user.id,
          name,
          phone: normalizedPhone || "",
          email: user.email,
          line1: address.line1,
          line2: address.line2 || null,
          city: address.city,
          state: address.state,
          zip: address.zip,
          country: address.country || 'US',
          isDefault: true,
        },
      });
    } catch (err) {
      logger.warn(`Could not save address during register for ${user.email}: ${err.message}`);
    }
  }

  if (!normalizedEmail) {
    const tokens = await issueCustomerTokens(user);
    return {
      ...tokens,
      phone: normalizedPhone,
      message: 'Account created',
    };
  }

  const mailed = await sendEmail({
    to: user.email,
    subject: 'Verify your SCOSHA email',
    html: otpEmail({ name: user.name, otp }),
  });

  if (!mailed.success && !mailed.skipped) {
    logger.warn(`OTP email failed for ${user.email}: ${mailed.message}`);
  }
  if (!mailed.success) {
    logger.info(`[DEV OTP] ${user.email} => ${otp}`);
  }

  const payload = {
    email: user.email,
    message: mailed.success
      ? 'Registration successful. Please verify the OTP sent to your email.'
      : 'Registration successful, but email could not be sent. Use the OTP from the server log or contact support.',
  };

  // Only surface Dev OTP when mail failed (or SMTP off) — not when email was delivered
  if (env.isDev && !mailed.success) {
    payload.devOtp = otp;
  }

  return payload;
}

async function verifyEmail({ email, otp }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      passwordHash: true,
      isEmailVerified: true,
      roleId: true,
      refreshTokenHash: true,
      otpCode: true,
      otpExpiry: true,
      status: true,
      lastLogin: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) {
    return issueCustomerTokens(user);
  }
  if (!user.otpCode || !user.otpExpiry || user.otpExpiry < new Date()) {
    throw ApiError.badRequest('OTP expired. Please request a new one.');
  }
  if (user.otpCode !== otp) {
    throw ApiError.badRequest('Invalid OTP');
  }

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      otpCode: null,
      otpExpiry: null,
    },
  });

  // Non-blocking — do not delay login tokens on SMTP; test addresses are skipped in sendEmail
  sendEmailAsync({
    to: verified.email,
    subject: 'Welcome to SCOSHA',
    html: welcomeEmail({ name: verified.name }),
  });

  return issueCustomerTokens(verified);
}

async function resendOtp({ email }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      isEmailVerified: true,
      otpCode: true,
      otpExpiry: true,
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) throw ApiError.badRequest('Email already verified');

  if (user.otpExpiry) {
    const sentAt = user.otpExpiry.getTime() - OTP_TTL_MS;
    const waitMs = OTP_RESEND_COOLDOWN_MS - (Date.now() - sentAt);
    if (waitMs > 0) {
      throw ApiError.badRequest(
        `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`
      );
    }
  }

  const otp = generateOtp(6);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: otp,
      otpExpiry: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  const mailed = await sendEmail({
    to: user.email,
    subject: 'Your SCOSHA verification code',
    html: otpEmail({ name: user.name, otp }),
  });

  if (!mailed.success && !mailed.skipped) {
    logger.warn(`OTP resend failed for ${user.email}: ${mailed.message}`);
  }
  if (!mailed.success) {
    logger.info(`[DEV OTP] ${user.email} => ${otp}`);
  }

  const payload = {
    email: user.email,
    message: mailed.success
      ? 'OTP resent successfully'
      : 'OTP generated but email failed. Check server log for the code.',
  };
  if (env.isDev && !mailed.success) payload.devOtp = otp;
  return payload;
}

async function login({ email, phone, password }) {
  const select = {
    id: true,
    name: true,
    email: true,
    phone: true,
    googleId: true,
    passwordHash: true,
    isEmailVerified: true,
    roleId: true,
    refreshTokenHash: true,
    status: true,
    lastLogin: true,
    avatar: true,
    createdAt: true,
    updatedAt: true,
  };
  const user = email
    ? await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select,
      })
    : await findUserByPhone(phone, select);
  if (!user) {
    throw ApiError.unauthorized(email ? 'Invalid email or password' : 'Invalid phone or password');
  }
  if (user.status === 'banned') throw ApiError.forbidden('Account is banned');

  const valid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!valid) {
    throw ApiError.unauthorized(
      user.googleId
        ? 'Invalid password. You can also continue with Google.'
        : email
          ? 'Invalid email or password'
          : 'Invalid phone or password',
    );
  }
  if (email && !user.isEmailVerified) {
    throw ApiError.forbidden('Email verification required', [
      { field: 'email', code: 'EMAIL_UNVERIFIED', message: 'Verify your email before signing in' },
    ]);
  }

  return issueCustomerTokens(user);
}

async function googleLogin({ accessToken }) {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw ApiError.badRequest('Google sign-in is not connected yet');

  const infoRes = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  const info = await infoRes.json().catch(() => ({}));
  if (!infoRes.ok || info.aud !== clientId) {
    throw ApiError.unauthorized('Google sign-in failed');
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await profileRes.json().catch(() => ({}));
  const email = profile.email ? String(profile.email).toLowerCase() : '';
  const googleId = profile.sub ? String(profile.sub) : '';
  const verified = profile.email_verified === true || profile.email_verified === 'true';
  if (!profileRes.ok || !email || !googleId || !verified) {
    throw ApiError.unauthorized('Google did not share a verified email');
  }

  const customerRole = await prisma.role.findUnique({ where: { name: 'Customer' } });
  let user = await prisma.user.findUnique({ where: { googleId } });
  if (!user) user = await prisma.user.findUnique({ where: { email } });

  if (user?.status === 'banned') throw ApiError.forbidden('Account is banned');

  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), env.BCRYPT_SALT_ROUNDS);
    user = await prisma.user.create({
      data: {
        name: profile.name || email.split('@')[0],
        email,
        googleId,
        passwordHash,
        roleId: customerRole?.id ?? null,
        isEmailVerified: true,
        avatar: profile.picture || null,
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId,
        isEmailVerified: true,
        avatar: user.avatar || profile.picture || null,
        name: user.name || profile.name || email.split('@')[0],
      },
    });
  }

  return issueCustomerTokens(user);
}

async function refresh(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token required');

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  if (decoded.type !== 'customer') throw ApiError.unauthorized('Invalid token type');

  const user = await prisma.user.findUnique({
    where: { id: Number(decoded.id) },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      passwordHash: true,
      isEmailVerified: true,
      roleId: true,
      refreshTokenHash: true,
      tokenVersion: true,
      status: true,
      lastLogin: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user || user.status !== 'active') throw ApiError.unauthorized('User not found');

  const match = await compareToken(refreshToken, user.refreshTokenHash);
  if (!match) throw ApiError.unauthorized('Refresh token revoked');

  return issueCustomerTokens(user, { expectedRefreshHash: user.refreshTokenHash });
}

async function logout(userId) {
  await prisma.user.update({
    where: { id: Number(userId) },
    data: { refreshTokenHash: null, tokenVersion: { increment: 1 } },
  });
  return { message: 'Logged out' };
}

async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      resetPasswordToken: true,
      resetPasswordExpiry: true,
    },
  });
  if (!user) {
    return { message: 'If that email exists, a reset link has been sent' };
  }

  const token = generateResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: await hashToken(token),
      resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${env.STOREFRONT_URL}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your SCOSHA password',
    html: forgotPasswordEmail({ name: user.name, resetUrl }),
  });

  return { message: 'If that email exists, a reset link has been sent' };
}

async function resetPassword({ token, email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      resetPasswordToken: true,
      resetPasswordExpiry: true,
    },
  });
  if (!user || !user.resetPasswordToken || !user.resetPasswordExpiry) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }
  if (user.resetPasswordExpiry < new Date()) {
    throw ApiError.badRequest('Reset token expired');
  }

  const match = await compareToken(token, user.resetPasswordToken);
  if (!match) throw ApiError.badRequest('Invalid or expired reset token');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS),
      resetPasswordToken: null,
      resetPasswordExpiry: null,
      refreshTokenHash: null,
      tokenVersion: { increment: 1 },
    },
  });

  return { message: 'Password reset successful' };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      passwordHash: true,
    },
  });
  if (!user) throw ApiError.notFound('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS),
      refreshTokenHash: null,
      tokenVersion: { increment: 1 },
    },
  });

  return { message: 'Password changed successfully' };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: { role: true },
  });
  if (!user) throw ApiError.notFound('User not found');
  return sanitizeUser({ ...user, roleId: user.role });
}

module.exports = {
  register,
  verifyEmail,
  resendOtp,
  login,
  googleLogin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  sanitizeUser,
};
