import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { GUEST_EMAIL } from '../config/env.js';

const router = express.Router();
const prisma = new PrismaClient();

// Inline admin guard (req.user not set by authenticate, so we DB-check)
const requireAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
  if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
};

// GET /api/admin/guest-content
// Returns all problems and feedbacks owned by the GUESTBRUINS account
router.get('/guest-content', authenticate, requireAdmin, async (req, res) => {
  try {
    const guest = await prisma.user.findUnique({ where: { email: GUEST_EMAIL } });
    if (!guest) return res.status(404).json({ error: 'GUESTBRUINS account not found' });

    const [problems, feedbacks, users] = await Promise.all([
      prisma.problem.findMany({
        where: { authorId: guest.id },
        select: {
          id: true,
          latex: true,
          answer: true,
          topics: true,
          quality: true,
          stage: true,
          examType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.findMany({
        where: { userId: guest.id },
        select: {
          id: true,
          problemId: true,
          feedback: true,
          answer: true,
          isEndorsement: true,
          resolved: true,
          createdAt: true,
          problem: { select: { id: true, latex: true, topics: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // All non-guest real users to populate target dropdown
      prisma.user.findMany({
        where: { email: { not: GUEST_EMAIL } },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: { firstName: 'asc' },
      }),
    ]);

    res.json({ guestId: guest.id, problems, feedbacks, users });
  } catch (error) {
    console.error('guest-content error:', error);
    res.status(500).json({ error: 'Failed to load guest content' });
  }
});

export default router;
