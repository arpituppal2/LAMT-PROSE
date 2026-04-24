import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

const problemInclude = {
  problems: {
    include: {
      author: { select: { firstName: true, lastName: true, initials: true } }
    }
  },
  author: { select: { id: true, firstName: true, lastName: true, initials: true, isAdmin: true } },
  tournament: { select: { id: true, name: true } },
  comments: {
    include: { user: { select: { id: true, firstName: true, lastName: true, initials: true } } },
    orderBy: { createdAt: 'asc' }
  }
};

// Create test
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      competition, name, description,
      roundType, roundName, numSets, questionsPerSet, estimationSets,
      examTopics, tournamentId,
      problemIds,
    } = req.body;
    const test = await prisma.test.create({
      data: {
        competition,
        name,
        description: description || null,
        roundType:       roundType       || null,
        roundName:       roundName       || null,
        numSets:         numSets         != null ? parseInt(numSets)         : 1,
        questionsPerSet: questionsPerSet != null ? parseInt(questionsPerSet) : 10,
        estimationSets:  estimationSets  != null ? parseInt(estimationSets)  : 0,
        examTopics:      Array.isArray(examTopics) ? examTopics : [],
        tournamentId:    tournamentId    || null,
        authorId: req.userId,
        problems: { connect: (problemIds || []).map(id => ({ id })) },
      },
      include: problemInclude,
    });
    res.json(test);
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

// Get all tests
router.get('/', authenticate, async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      include: problemInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Get single test
router.get('/:id', authenticate, async (req, res) => {
  try {
    const test = await prisma.test.findUnique({
      where: { id: req.params.id },
      include: problemInclude,
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// Helper: check edit permission
const canEdit = async (testId, userId) => {
  const [test, user] = await Promise.all([
    prisma.test.findUnique({ where: { id: testId }, select: { authorId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
  ]);
  if (!test) return false;
  return user?.isAdmin || test.authorId === userId || test.authorId === null;
};

// Update test metadata
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can edit this exam.' });
    }
    const {
      competition, name, description,
      roundType, roundName, numSets, questionsPerSet, estimationSets,
      examTopics, tournamentId,
      // lock fields
      isLocked, testsolvePassword, testsolveVersion, testsolveStatus,
    } = req.body;
    const updateData = {
      competition, name,
      description: description ?? null,
      roundType:       roundType       !== undefined ? (roundType || null)       : undefined,
      roundName:       roundName       !== undefined ? (roundName || null)       : undefined,
      numSets:         numSets         != null ? parseInt(numSets)         : undefined,
      questionsPerSet: questionsPerSet != null ? parseInt(questionsPerSet) : undefined,
      estimationSets:  estimationSets  != null ? parseInt(estimationSets)  : undefined,
      examTopics:      Array.isArray(examTopics) ? examTopics : undefined,
      tournamentId:    tournamentId    !== undefined ? (tournamentId || null)    : undefined,
      // lock fields — only write if explicitly provided
      isLocked:           isLocked           !== undefined ? Boolean(isLocked)                   : undefined,
      testsolvePassword:  testsolvePassword  !== undefined ? (testsolvePassword || null)          : undefined,
      testsolveVersion:   testsolveVersion   != null       ? parseInt(testsolveVersion)            : undefined,
      testsolveStatus:    testsolveStatus    !== undefined ? (testsolveStatus || null)             : undefined,
      // stamp lockedAt when locking
      ...(isLocked === true  ? { lockedAt: new Date() } : {}),
      ...(isLocked === false ? { lockedAt: null }       : {}),
    };
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: updateData,
      include: problemInclude,
    });
    res.json(test);
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Update slots
router.put('/:id/slots', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can edit slots.' });
    }
    const { slots } = req.body;
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { slots },
      include: problemInclude,
    });
    res.json(test);
  } catch (error) {
    console.error('Update slots error:', error);
    res.status(500).json({ error: 'Failed to update slots' });
  }
});

// Add a problem
router.post('/:id/problems', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can edit this exam.' });
    }
    const { problemId } = req.body;
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { problems: { connect: { id: problemId } } },
      include: problemInclude,
    });
    res.json(test);
  } catch (error) {
    console.error('Add problem to test error:', error);
    res.status(500).json({ error: 'Failed to add problem to test' });
  }
});

// Remove a problem
router.delete('/:id/problems/:problemId', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can edit this exam.' });
    }
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { problems: { disconnect: { id: req.params.problemId } } },
      include: problemInclude,
    });
    res.json(test);
  } catch (error) {
    console.error('Remove problem from test error:', error);
    res.status(500).json({ error: 'Failed to remove problem from test' });
  }
});

// Delete a test
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can delete this exam.' });
    }
    await prisma.test.update({
      where: { id: req.params.id },
      data: { problems: { set: [] } },
    });
    await prisma.testComment.deleteMany({ where: { testId: req.params.id } });
    await prisma.test.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

// ── Comments ──────────────────────────────────────────────────────────────
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const comments = await prisma.testComment.findMany({
      where: { testId: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, initials: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Comment body is required.' });
    const comment = await prisma.testComment.create({
      data: { testId: req.params.id, userId: req.userId, body: body.trim() },
      include: { user: { select: { id: true, firstName: true, lastName: true, initials: true } } },
    });
    res.json(comment);
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

router.delete('/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    const comment = await prisma.testComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
    if (comment.userId !== req.userId && !user?.isAdmin) {
      return res.status(403).json({ error: 'Cannot delete this comment.' });
    }
    await prisma.testComment.delete({ where: { id: req.params.commentId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ── Lock exam for testsolving ──────────────────────────────────────────────
router.post('/:id/lock', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required to lock exams.' });
    const { timeLimit } = req.body;
    if (!timeLimit || isNaN(parseInt(timeLimit)) || parseInt(timeLimit) < 1) {
      return res.status(400).json({ error: 'A valid time limit is required.' });
    }
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        timeLimit: parseInt(timeLimit),
      },
    });
    res.json(test);
  } catch (error) {
    console.error('Lock exam error:', error);
    res.status(500).json({ error: 'Failed to lock exam' });
  }
});

// ── Unlock exam ────────────────────────────────────────────────────────────
router.post('/:id/unlock', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required to unlock exams.' });
    const current = await prisma.test.findUnique({
      where: { id: req.params.id },
      select: { testsolveVersion: true, testsolveStatus: true },
    });
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: {
        isLocked: false,
        lockedAt: null,
        testsolveStatus: current?.testsolveStatus === 'active' ? 'paused' : (current?.testsolveStatus ?? 'none'),
        testsolveVersion: { increment: 1 },
      },
    });
    res.json(test);
  } catch (error) {
    console.error('Unlock exam error:', error);
    res.status(500).json({ error: 'Failed to unlock exam' });
  }
});

// ── Publish testsolving (set password + activate) ──────────────────────────
router.post('/:id/testsolve/publish', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required.' });
    const { password } = req.body;
    if (!password?.trim()) return res.status(400).json({ error: 'A testsolve password is required.' });
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { testsolveStatus: 'active', testsolvePassword: password.trim() },
    });
    res.json(test);
  } catch (error) {
    console.error('Publish testsolve error:', error);
    res.status(500).json({ error: 'Failed to publish testsolving' });
  }
});

// ── Get testsolve password (admin only) ────────────────────────────────────
router.get('/:id/testsolve/password', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required.' });
    const test = await prisma.test.findUnique({
      where: { id: req.params.id },
      select: { testsolvePassword: true },
    });
    if (!test) return res.status(404).json({ error: 'Exam not found.' });
    res.json({ password: test.testsolvePassword });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get password' });
  }
});

// ── Get testsolve sessions for an exam (admin only) ────────────────────────
router.get('/:id/testsolve/sessions', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required.' });
    const sessions = await prisma.testsolveSession.findMany({
      where: { testId: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, initials: true } },
        problemResponses: true,
        overall: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
    res.json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
