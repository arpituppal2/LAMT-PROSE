import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { ALLOWED_EMAIL_DOMAIN } from '../config/env.js';

const router = express.Router();
const prisma = new PrismaClient();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  initials: true,
  mathExp: true,
  isAdmin: true,
  disabled: true,
  pageAccess: true,
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, inviteCode, firstName, lastName, mathExp } = req.body;
    if (ALLOWED_EMAIL_DOMAIN && !email?.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      return res.status(400).json({ error: `Must use a @${ALLOWED_EMAIL_DOMAIN} email address` });
    }
    if (inviteCode !== process.env.INVITE_CODE) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, initials, mathExp },
      select: USER_SELECT,
    });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.disabled) {
      return res.status(403).json({ error: 'ACCOUNT_DISABLED' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTS);
    const { password: _pw, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { sameSite: 'none', secure: true });
  res.json({ message: 'Logged out' });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: USER_SELECT,
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update current user profile
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { mathExp } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { mathExp },
      select: USER_SELECT,
    });
    res.json({ user: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required' });
    }
    if (resetCode !== process.env.RESET_CODE) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'No account found with that email' });
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

export default router;
