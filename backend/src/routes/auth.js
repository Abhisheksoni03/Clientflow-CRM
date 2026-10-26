import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from '../lib/passwordResetEmail.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' },
});
function createPasswordResetLimiter(message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}
const forgotPasswordLimiter = createPasswordResetLimiter(
  'Too many password reset requests. Please wait 15 minutes and try again.',
);
const resetPasswordLimiter = createPasswordResetLimiter(
  'Too many password reset attempts. Please wait 15 minutes and try again.',
);

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), ver: user.sessionVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

router.post('/register', authLimiter, async (request, response, next) => {
  try {
    const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';

    if (name.length < 2 || name.length > 80) {
      return response.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
    }
    if (email.length > 254 || !emailPattern.test(email)) {
      return response.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (password.length < 10 || password.length > 72) {
      return response.status(400).json({ message: 'Password must be between 10 and 72 characters.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    return response.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'An account with this email already exists.' });
    return next(error);
  }
});

router.post('/login', authLimiter, async (request, response, next) => {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';
    const user = await User.findOne({ email }).select('+passwordHash +sessionVersion');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return response.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/forgot-password', forgotPasswordLimiter, async (request, response, next) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !emailPattern.test(email)) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }
  try {
    if (!isPasswordResetEmailConfigured()) {
      return response.status(503).json({
        message: 'Password reset email is not configured. Ask the administrator to configure SMTP settings.',
      });
    }

    const user = await User.findOne({ email }).select('+passwordResetRequestedAt');
    if (!user) {
      return response.json({ message: 'If an account exists for this email, a password reset link will be sent.' });
    }

    const now = new Date();
    const cooldownMs = 60 * 1000;
    if (user.passwordResetRequestedAt && now - user.passwordResetRequestedAt < cooldownMs) {
      return response.json({ message: 'If an account exists for this email, a password reset link will be sent.' });
    }

    const token = randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashResetToken(token);
    user.passwordResetExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    user.passwordResetRequestedAt = now;
    await user.save();

    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, token });
    } catch (error) {
      await User.updateOne(
        { _id: user._id, passwordResetTokenHash: hashResetToken(token) },
        { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
      );
      console.error(`Password reset email delivery failed (${error.code || error.name || 'unknown error'}).`);
      return response.status(503).json({
        message: 'The password reset email could not be sent. Check the email service configuration and try again.',
      });
    }

    return response.json({ message: 'If an account exists for this email, a password reset link will be sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', resetPasswordLimiter, async (request, response, next) => {
  const token = typeof request.body.token === 'string' ? request.body.token : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return response.status(400).json({ message: 'This password reset link is invalid or has expired. Request a new link.' });
  }
  if (password.length < 10 || password.length > 72) {
    return response.status(400).json({ message: 'Password must be between 10 and 72 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await User.updateOne(
      {
        passwordResetTokenHash: hashResetToken(token),
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: { passwordHash },
        $inc: { sessionVersion: 1 },
        $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1, passwordResetRequestedAt: 1 },
      },
    );

    if (result.modifiedCount !== 1) {
      return response.status(400).json({ message: 'This password reset link is invalid or has expired. Request a new link.' });
    }
    return response.json({ message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id).lean();
    if (!user) return response.status(401).json({ message: 'Your account is no longer available. Please sign in again.' });
    return response.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
