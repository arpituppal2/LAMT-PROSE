import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { GUEST_EMAIL } from '../config/env.js';

const router = express.Router();
const prisma = new PrismaClient();

const requireAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
  if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
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
  createdAt: true,
  _count: { select: { problems: true, feedbacks: true } },
};

// ── GET /api/admin/users ─────────────────────────────────────
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      select: USER_SELECT,
      orderBy: { firstName: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── GET /api/admin/users/:id ────────────────────────────────
router.get('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: USER_SELECT,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isAdmin) return res.status(403).json({ error: 'Cannot manage admin accounts here' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── PATCH /api/admin/users/:id ──────────────────────────────
router.patch('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, initials, disabled, pageAccess } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.isAdmin) return res.status(403).json({ error: 'Cannot modify admin accounts' });

    const data = {};
    if (firstName  !== undefined) data.firstName  = firstName;
    if (lastName   !== undefined) data.lastName   = lastName;
    if (initials   !== undefined) data.initials   = initials.toUpperCase();
    if (disabled   !== undefined) data.disabled   = disabled;
    if (pageAccess !== undefined) data.pageAccess = pageAccess;

    if (initials !== undefined && initials.toUpperCase() !== existing.initials) {
      const oldPrefix = existing.initials + '-';
      const newPrefix = initials.toUpperCase() + '-';
      const problems = await prisma.problem.findMany({
        where: { authorId: req.params.id },
        select: { id: true },
      });
      for (const p of problems) {
        if (p.id.startsWith(oldPrefix)) {
          const newId = newPrefix + p.id.slice(oldPrefix.length);
          await prisma.$executeRawUnsafe(
            `UPDATE "Problem" SET id = $1 WHERE id = $2`,
            newId, p.id
          );
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: USER_SELECT,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ── GET /api/admin/guest-content ────────────────────────────
router.get('/guest-content', authenticate, requireAdmin, async (req, res) => {
  try {
    const guest = await prisma.user.findUnique({ where: { email: GUEST_EMAIL } });
    if (!guest) return res.status(404).json({ error: 'GUESTBRUINS account not found' });

    const [problems, feedbacks, users] = await Promise.all([
      prisma.problem.findMany({
        where: { authorId: guest.id },
        select: {
          id: true, latex: true, answer: true,
          topics: true, quality: true, stage: true,
          examType: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.findMany({
        where: { userId: guest.id },
        select: {
          id: true, problemId: true, feedback: true,
          answer: true, isEndorsement: true, resolved: true, createdAt: true,
          problem: { select: { id: true, latex: true, topics: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
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

// ════════════════════════════════════════════════════════════
// TOURNAMENTS
// ════════════════════════════════════════════════════════════

// GET /api/admin/tournaments — list all (any authenticated user can read)
router.get('/tournaments', authenticate, async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { name: 'asc' },
      include: { rounds: { orderBy: { name: 'asc' } } },
    });
    res.json(tournaments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// POST /api/admin/tournaments — create
router.post('/tournaments', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tournament name is required.' });
    const tournament = await prisma.tournament.create({
      data: { name: name.trim(), description: description?.trim() || null },
      include: { rounds: true },
    });
    res.json(tournament);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// PATCH /api/admin/tournaments/:id — update name/description
router.patch('/tournaments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    const tournament = await prisma.tournament.update({
      where: { id: req.params.id },
      data,
      include: { rounds: { orderBy: { name: 'asc' } } },
    });
    res.json(tournament);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// DELETE /api/admin/tournaments/:id
router.delete('/tournaments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.tournamentRound.deleteMany({ where: { tournamentId: req.params.id } });
    // Null out tournamentId on any associated tests
    await prisma.test.updateMany({ where: { tournamentId: req.params.id }, data: { tournamentId: null } });
    await prisma.tournament.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// ── Rounds ───────────────────────────────────────────────────

// POST /api/admin/tournaments/:id/rounds
router.post('/tournaments/:id/rounds', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, roundType } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Round name is required.' });
    const round = await prisma.tournamentRound.create({
      data: {
        tournamentId: req.params.id,
        name: name.trim(),
        roundType: roundType || 'Individual',
      },
    });
    res.json(round);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create round' });
  }
});

// PATCH /api/admin/tournaments/:id/rounds/:roundId
router.patch('/tournaments/:id/rounds/:roundId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, roundType } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (roundType !== undefined) data.roundType = roundType;
    const round = await prisma.tournamentRound.update({
      where: { id: req.params.roundId },
      data,
    });
    res.json(round);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update round' });
  }
});

// DELETE /api/admin/tournaments/:id/rounds/:roundId
router.delete('/tournaments/:id/rounds/:roundId', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.tournamentRound.delete({ where: { id: req.params.roundId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete round' });
  }
});

export default router;
