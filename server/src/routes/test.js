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
  comments: {
    include: { user: { select: { id: true, firstName: true, lastName: true, initials: true } } },
    orderBy: { createdAt: 'asc' }
  }
};

// Create test
router.post('/', authenticate, async (req, res) => {
  try {
    const { competition, name, description, version, problemIds, templateType } = req.body;
    const test = await prisma.test.create({
      data: {
        competition,
        name,
        description,
        version,
        templateType: templateType || null,
        authorId: req.userId,
        problems: { connect: (problemIds || []).map(id => ({ id })) }
      },
      include: problemInclude
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
      orderBy: { createdAt: 'desc' }
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
      include: problemInclude
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
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  ]);
  if (!test) return false;
  return user?.isAdmin || test.authorId === userId || test.authorId === null;
};

// Update test metadata (admin or author only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can edit this exam.' });
    }
    const { competition, name, description, version } = req.body;
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { competition, name, description, version },
      include: problemInclude
    });
    res.json(test);
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Add a problem (admin or author only)
router.post('/:id/problems', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can edit this exam.' });
    }
    const { problemId } = req.body;
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { problems: { connect: { id: problemId } } },
      include: problemInclude
    });
    res.json(test);
  } catch (error) {
    console.error('Add problem to test error:', error);
    res.status(500).json({ error: 'Failed to add problem to test' });
  }
});

// Remove a problem (admin or author only)
router.delete('/:id/problems/:problemId', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can edit this exam.' });
    }
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { problems: { disconnect: { id: req.params.problemId } } },
      include: problemInclude
    });
    res.json(test);
  } catch (error) {
    console.error('Remove problem from test error:', error);
    res.status(500).json({ error: 'Failed to remove problem from test' });
  }
});

// Delete a test (admin or author only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!(await canEdit(req.params.id, req.userId))) {
      return res.status(403).json({ error: 'Only the exam author or an admin can delete this exam.' });
    }
    // Disconnect all problems first to avoid FK issues on legacy rows
    await prisma.test.update({
      where: { id: req.params.id },
      data: { problems: { set: [] } }
    });
    await prisma.testComment.deleteMany({ where: { testId: req.params.id } });
    await prisma.test.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

// ── Comments ──────────────────────────────────────────────────────────────────

// Get comments for a test
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const comments = await prisma.testComment.findMany({
      where: { testId: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, initials: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Post a comment (any authenticated user)
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Comment body is required.' });
    const comment = await prisma.testComment.create({
      data: { testId: req.params.id, userId: req.userId, body: body.trim() },
      include: { user: { select: { id: true, firstName: true, lastName: true, initials: true } } }
    });
    res.json(comment);
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Delete a comment (own comment or admin)
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

export default router;
