import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

const ADMIN_EMAILS = ['arpituppal@ucla.edu'];
const ADMIN_CODE = 'LAMTADMIN839fhy38fynx389hm09h';

// Helper: compute display status based on unresolved feedback priority
function computeDisplayStatus(problem) {
  const hasUnresolvedFeedback = problem.feedbacks?.some(
    (f) => !f.resolved && !f.isEndorsement
  );
  if (hasUnresolvedFeedback) return 'needs_review';
  if (problem.endorsements > 0) return 'endorsed';
  return problem.stage;
}

// GET /feedback/next — random problem (least solves)
router.get('/next', authenticate, async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      where: {
        authorId: { not: req.userId },
        stage: { notIn: ['On Test', 'Approved for Exam'] },
      },
      include: {
        author: { select: { firstName: true, lastName: true, initials: true } },
        feedbacks: { where: { userId: req.userId } },
      },
    });
    const unreviewed = problems.filter((p) => p.feedbacks.length === 0);
    if (unreviewed.length === 0) return res.json(null);
    const minSolve = Math.min(...unreviewed.map((p) => p.solveCount ?? 0));
    const candidates = unreviewed.filter((p) => (p.solveCount ?? 0) === minSolve);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const { feedbacks, ...problem } = chosen;
    return res.json(problem);
  } catch (error) {
    console.error('Get next problem error:', error);
    return res.status(500).json({ error: 'Failed to fetch next problem' });
  }
});

// GET /feedback/reviewable — all problems eligible for review (targeted)
router.get('/reviewable', authenticate, async (req, res) => {
  try {
    const { topic, stage, author } = req.query;
    const where = {
      authorId: { not: req.userId },
      stage: { notIn: ['On Test', 'Approved for Exam', 'Published'] },
    };
    if (topic) where.topics = { has: topic };
    if (stage) where.stage = stage;
    if (author) where.authorId = author;
    const problems = await prisma.problem.findMany({
      where,
      include: {
        author: { select: { firstName: true, lastName: true, initials: true } },
        feedbacks: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const result = problems.map((p) => ({
      ...p,
      _displayStatus: computeDisplayStatus(p),
    }));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch reviewable problems' });
  }
});

// GET /feedback/my-feedback — current user's feedback history
router.get('/my-feedback', authenticate, async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { userId: req.userId },
      include: {
        problem: { select: { id: true, latex: true, stage: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const result = feedbacks.map((f) => ({
      id: f.id,
      problemId: f.problemId,
      problem: f.problem,
      resolved: f.resolved,
      isEndorsement: f.isEndorsement,
      comment: f.feedback,
      updatedAt: f.updatedAt,
    }));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch your feedback' });
  }
});

// POST /feedback — submit feedback or endorsement
router.post('/', authenticate, async (req, res) => {
  try {
    const { problemId, answer, feedback, timeSpent, isEndorsement } = req.body;
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    const existing = await prisma.feedback.findFirst({
      where: { problemId, userId: req.userId, isEndorsement: !!isEndorsement },
    });
    if (existing) {
      return res.status(400).json({
        error: `Already submitted ${isEndorsement ? 'an endorsement' : 'feedback'} for this problem`,
      });
    }
    const newFeedback = await prisma.feedback.create({
      data: {
        problemId,
        userId: req.userId,
        answer: answer || '',
        feedback: feedback || '',
        timeSpent,
        isEndorsement: !!isEndorsement,
        needsReview: !isEndorsement,
        resolved: false,
      },
    });
    const updateData = {};
    if (isEndorsement) {
      updateData.endorsements = { increment: 1 };
    } else {
      updateData.solveCount = { increment: 1 };
    }
    const updatedProblem = await prisma.problem.update({
      where: { id: problemId },
      data: updateData,
    });
    if (isEndorsement && updatedProblem.endorsements >= 1 && updatedProblem.stage === 'Idea') {
      await prisma.problem.update({
        where: { id: problemId },
        data: { stage: 'Endorsed' },
      });
    }
    if (isEndorsement && updatedProblem.endorsements >= 3 && updatedProblem.stage === 'Review') {
      await prisma.problem.update({
        where: { id: problemId },
        data: { stage: 'Live/Ready for Review' },
      });
    }
    return res.json(newFeedback);
  } catch (error) {
    console.error('Submit feedback error:', error);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /feedback/problem/:problemId — all feedback for a problem
router.get('/problem/:problemId', authenticate, async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { problemId: req.params.problemId },
      include: {
        user: { select: { firstName: true, lastName: true, initials: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(feedbacks);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// PATCH /feedback/:id — edit feedback (creator or admin)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { comment, resolved } = req.body;
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, email: true },
    });
    const isAdmin = currentUser?.isAdmin || ADMIN_EMAILS.includes(currentUser?.email);
    const fb = await prisma.feedback.findUnique({
      where: { id: req.params.id },
      include: { problem: true },
    });
    if (!fb) return res.status(404).json({ error: 'Feedback not found' });
    const isCreator = fb.userId === req.userId;
    const isProblemAuthor = fb.problem.authorId === req.userId;
    if (!isCreator && !isProblemAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this feedback' });
    }
    // Resolution requires a comment
    if (resolved === true) {
      const resolveComment = comment !== undefined ? comment : fb.feedback;
      if (!resolveComment || resolveComment.trim() === '') {
        return res.status(400).json({
          error: 'Resolution requires a comment explaining why',
        });
      }
    }
    const updateData = {};
    if (comment !== undefined) updateData.feedback = comment;
    if (resolved !== undefined) updateData.resolved = resolved;
    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: updateData,
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// PUT /feedback/:id/resolve — resolve feedback (problem author or admin) — requires comment
router.put('/:id/resolve', authenticate, async (req, res) => {
  try {
    const { comment } = req.body;
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, email: true },
    });
    const isAdmin = currentUser?.isAdmin || ADMIN_EMAILS.includes(currentUser?.email);
    const fb = await prisma.feedback.findUnique({
      where: { id: req.params.id },
      include: { problem: true },
    });
    if (!fb) return res.status(404).json({ error: 'Feedback not found' });
    const isProblemAuthor = fb.problem.authorId === req.userId;
    if (!isProblemAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // Require a comment to resolve
    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        error: 'Resolution requires a comment explaining why',
      });
    }
    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { resolved: true, feedback: fb.feedback + '\n\n[Resolution] ' + comment },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resolve feedback' });
  }
});

export default router;
