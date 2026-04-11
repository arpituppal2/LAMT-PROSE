import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Inline admin guard (req.user not set by authenticate, so we DB-check)
const requireAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
  if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
};

const GUEST_EMAIL = 'GUESTBRUINS@ucla.edu';

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

// POST /api/admin/transfer
// Body: { toUserId, problemIds: string[], feedbackIds: string[] }
// Re-attributes selected problems/feedbacks from GUESTBRUINS to toUserId
router.post('/transfer', authenticate, requireAdmin, async (req, res) => {
  const { toUserId, problemIds = [], feedbackIds = [] } = req.body;

  if (!toUserId) return res.status(400).json({ error: 'toUserId is required' });
  if (!problemIds.length && !feedbackIds.length)
    return res.status(400).json({ error: 'Select at least one problem or feedback to transfer' });

  try {
    const [guest, target] = await Promise.all([
      prisma.user.findUnique({ where: { email: GUEST_EMAIL } }),
      prisma.user.findUnique({ where: { id: toUserId } }),
    ]);
    if (!guest) return res.status(404).json({ error: 'GUESTBRUINS account not found' });
    if (!target) return res.status(404).json({ error: 'Target user not found' });

    // Safety: only transfer items that actually belong to GUESTBRUINS
    const result = await prisma.$transaction(async (tx) => {
      let movedProblems = 0;
      let movedFeedbacks = 0;

      if (problemIds.length) {
        const { count } = await tx.problem.updateMany({
          where: { id: { in: problemIds }, authorId: guest.id },
          data: { authorId: toUserId },
        });
        movedProblems = count;
      }

      if (feedbackIds.length) {
        const { count } = await tx.feedback.updateMany({
          where: { id: { in: feedbackIds }, userId: guest.id },
          data: { userId: toUserId },
        });
        movedFeedbacks = count;
      }

      return { movedProblems, movedFeedbacks };
    });

    res.json({
      message: `Transferred ${result.movedProblems} problem(s) and ${result.movedFeedbacks} feedback(s) to ${target.firstName} ${target.lastName}.`,
      ...result,
    });
  } catch (error) {
    console.error('transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

export default router;
