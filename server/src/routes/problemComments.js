import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

const commentInclude = {
  user: { select: { id: true, firstName: true, lastName: true, initials: true } },
  replies: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, initials: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
};

// GET /api/problems/:problemId/comments
router.get('/', authenticate, async (req, res) => {
  try {
    const comments = await prisma.problemComment.findMany({
      where: { problemId: req.params.problemId, parentId: null },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/problems/:problemId/comments
router.post('/', authenticate, async (req, res) => {
  try {
    const { body, parentId } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Comment body is required.' });
    // validate parent belongs to same problem
    if (parentId) {
      const parent = await prisma.problemComment.findUnique({ where: { id: parentId } });
      if (!parent || parent.problemId !== req.params.problemId) {
        return res.status(400).json({ error: 'Invalid parent comment.' });
      }
    }
    const comment = await prisma.problemComment.create({
      data: {
        problemId: req.params.problemId,
        userId: req.userId,
        body: body.trim(),
        parentId: parentId || null,
      },
      include: commentInclude,
    });
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// DELETE /api/problems/:problemId/comments/:commentId
router.delete('/:commentId', authenticate, async (req, res) => {
  try {
    const comment = await prisma.problemComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });
    if (comment.userId !== req.userId && !user?.isAdmin) {
      return res.status(403).json({ error: 'Cannot delete this comment.' });
    }
    // cascade-delete replies manually (Prisma self-relation onDelete may not propagate in all versions)
    await prisma.problemComment.deleteMany({ where: { parentId: req.params.commentId } });
    await prisma.problemComment.delete({ where: { id: req.params.commentId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /api/problems/:problemId/comments/:commentId/like
router.post('/:commentId/like', authenticate, async (req, res) => {
  try {
    const comment = await prisma.problemComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const alreadyLiked = comment.likes.includes(req.userId);
    const updated = await prisma.problemComment.update({
      where: { id: req.params.commentId },
      data: {
        likes: alreadyLiked
          ? { set: comment.likes.filter(id => id !== req.userId) }
          : { push: req.userId },
      },
      include: commentInclude,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

export default router;
