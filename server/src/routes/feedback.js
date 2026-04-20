import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

const ADMIN_EMAILS = [
  'arpituppal@ucla.edu',
  'kennethren271@ucla.edu',
  'brookswang@ucla.edu',
  'zhangv29@ucla.edu',
  'tomwu@g.ucla.edu',
  'muztabasyed@ucla.edu',
];

// Compute display status using hierarchical classification:
// 1. Idea (no reviews/endorsements, freshly written)
// 2. Needs Review (has unresolved non-endorsement feedback)
// 3. Endorsed (has endorsements, no unresolved feedback)
function computeDisplayStatus(problem) {
    if (problem.stage === 'Archived') return 'Archived';
  const hasUnresolvedFeedback = problem.feedbacks?.some(
    (f) => !f.resolved && !f.isEndorsement
  );
  if (hasUnresolvedFeedback) return 'Needs Review';
  if (problem.endorsements > 0) return 'Endorsed';
  return problem.stage || 'Idea';
}

// GET /feedback/next
// Returns the single best problem to review for the current user:
//   1. Not authored by the current user
//   2. Not already reviewed (any feedback record) by the current user
//   3. Sorted: fewest total feedback records first, then oldest createdAt first
router.get('/next', authenticate, async (req, res) => {
  try {
    const { difficulty } = req.query;

    // Get all problem IDs this user has already reviewed
    const alreadyReviewed = await prisma.feedback.findMany({
      where: { userId: req.userId },
      select: { problemId: true },
    });
    const reviewedIds = alreadyReviewed.map((f) => f.problemId);

    const where = {
      authorId: { not: req.userId },
      ...(reviewedIds.length > 0 ? { id: { notIn: reviewedIds } } : {}),
    };
    if (difficulty) where.quality = difficulty;

    // Fetch candidates with their feedback count
    const problems = await prisma.problem.findMany({
      where,
      include: {
        author: { select: { firstName: true, lastName: true, initials: true } },
        _count: { select: { feedbacks: true } },
      },
      orderBy: [
        { createdAt: 'asc' }, // secondary: oldest first
      ],
    });

    if (problems.length === 0) return res.json(null);

    // Primary sort: fewest feedback records first
    problems.sort((a, b) => {
      const diff = (a._count?.feedbacks ?? 0) - (b._count?.feedbacks ?? 0);
      if (diff !== 0) return diff;
      // Secondary: oldest createdAt first (already sorted by DB, but belt-and-suspenders)
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const { _count, ...problem } = problems[0];
    return res.json(problem);
  } catch (error) {
    console.error('GET /feedback/next error:', error);
    return res.status(500).json({ error: 'Failed to fetch next problem' });
  }
});

// GET /feedback/reviewable - all problems eligible for review
router.get('/reviewable', authenticate, async (req, res) => {
  try {
    const { topic, stage, author, difficulty } = req.query;
    const alreadyReviewed = await prisma.feedback.findMany({
      where: { userId: req.userId },
      select: { problemId: true },
    });
    const reviewedIds = alreadyReviewed.map((f) => f.problemId);
    const where = {
      authorId: { not: req.userId },
      ...(reviewedIds.length > 0 ? { id: { notIn: reviewedIds } } : {}),
    };
    if (topic) where.topics = { has: topic };
    if (stage) where.stage = stage;
    if (author) where.authorId = author;
    if (difficulty) where.quality = difficulty;
    const problems = await prisma.problem.findMany({
      where,
      include: {
        author: { select: { firstName: true, lastName: true, initials: true } },
        feedbacks: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const result = problems
      .map((p) => ({
        ...p,
        _displayStatus: computeDisplayStatus(p),
        _feedbackCount: p.feedbacks.length,
      }))
      // Sort: fewest feedbacks first, then oldest
      .sort((a, b) => {
        const diff = a._feedbackCount - b._feedbackCount;
        if (diff !== 0) return diff;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    return res.json(result);
  } catch (error) {
    console.error('GET /feedback/reviewable error:', error);
    return res.status(500).json({ error: 'Failed to fetch reviewable problems' });
  }
});

// GET /feedback/my-feedback - current user's feedback history
router.get('/my-feedback', authenticate, async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { userId: req.userId },
      include: {
        problem: { select: { id: true, latex: true, stage: true, endorsements: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const result = feedbacks.map((f) => ({
      id: f.id,
      problemId: f.problemId,
      problem: f.problem,
      resolved: f.resolved,
      isEndorsement: f.isEndorsement,
      comment: f.feedback,
      authorReply: f.authorReply,
      answer: f.answer,
      createdAt: f.createdAt,
    }));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch your feedback' });
  }
});

// POST /feedback - submit feedback or endorsement
router.post('/', authenticate, async (req, res) => {
  try {
    const { problemId, answer, feedback, timeSpent, isEndorsement } = req.body;
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    // Prevent duplicate: one feedback (of any type) per user per problem
    const existing = await prisma.feedback.findFirst({
      where: { problemId, userId: req.userId },
    });
    if (existing) {
      return res.status(400).json({
        error: 'You have already submitted feedback for this problem',
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
    if (isEndorsement) {
      await prisma.problem.update({
        where: { id: problemId },
        data: { endorsements: { increment: 1 }, stage: 'Endorsed' },
      });
    } else {
      await prisma.problem.update({
        where: { id: problemId },
        data: { solveCount: { increment: 1 }, stage: 'Needs Review' },
      });
    }
    return res.json(newFeedback);
  } catch (error) {
    console.error('POST /feedback error:', error);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /feedback/problem/:problemId - all feedback for a problem
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

// PUT /feedback/:id/reply - problem author or admin adds/edits a reply
router.put('/:id/reply', authenticate, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || reply.trim() === '') {
      return res.status(400).json({ error: 'Reply text is required' });
    }
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
    const isProblemAuthor = String(fb.problem.authorId) === String(req.userId);
    if (!isProblemAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to reply to this feedback' });
    }
    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { authorReply: reply.trim() },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save reply' });
  }
});

// PATCH /feedback/:id - edit feedback (creator or admin only)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { comment, answer, isEndorsement } = req.body;
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
    const isCreator = String(fb.userId) === String(req.userId);
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this feedback' });
    }
    if (fb.resolved) {
      return res.status(400).json({ error: 'Cannot edit resolved feedback' });
    }

    const updateData = {};
    if (comment !== undefined) updateData.feedback = comment;
    if (answer !== undefined) updateData.answer = answer;

    if (isEndorsement !== undefined && isEndorsement !== fb.isEndorsement) {
      updateData.isEndorsement = isEndorsement;
      updateData.needsReview = !isEndorsement;
      const problemId = fb.problemId;
      const problem = fb.problem;

      if (isEndorsement) {
        const newEndorsements = (problem.endorsements || 0) + 1;
        const newSolveCount = Math.max(0, (problem.solveCount || 1) - 1);
        const remainingReviews = await prisma.feedback.count({
          where: { problemId, resolved: false, isEndorsement: false, id: { not: fb.id } },
        });
        const newStage = remainingReviews > 0 ? 'Needs Review' : 'Endorsed';
        await prisma.problem.update({
          where: { id: problemId },
          data: { endorsements: newEndorsements, solveCount: newSolveCount, stage: newStage },
        });
      } else {
        const newEndorsements = Math.max(0, (problem.endorsements || 1) - 1);
        const newSolveCount = (problem.solveCount || 0) + 1;
        await prisma.problem.update({
          where: { id: problemId },
          data: { endorsements: newEndorsements, solveCount: newSolveCount, stage: 'Needs Review' },
        });
      }
    }

    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: updateData,
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// PUT /feedback/:id/resolve - resolve feedback (problem author or admin)
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
    const isProblemAuthor = String(fb.problem.authorId) === String(req.userId);
    if (!isProblemAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ error: 'Resolution requires a comment explaining why' });
    }
    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { resolved: true, feedback: fb.feedback + '\n\n[Resolution] ' + comment },
    });
    const remaining = await prisma.feedback.count({
      where: { problemId: fb.problemId, resolved: false, isEndorsement: false },
    });
    if (remaining === 0) {
      const problem = await prisma.problem.findUnique({ where: { id: fb.problemId } });
      const newStage = (problem?.endorsements || 0) > 0 ? 'Endorsed' : 'Idea';
      await prisma.problem.update({ where: { id: fb.problemId }, data: { stage: newStage } });
    }
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resolve feedback' });
  }
});

// DELETE /feedback/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
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
    if (String(fb.userId) !== String(req.userId) && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this feedback' });
    }
    const problemId = fb.problemId;
    const problem = fb.problem;
    await prisma.feedback.delete({ where: { id: req.params.id } });
    const updateData = {};
    if (fb.isEndorsement) {
      const newEndorsements = Math.max(0, problem.endorsements - 1);
      updateData.endorsements = newEndorsements;
      const remainingReviews = await prisma.feedback.count({
        where: { problemId, resolved: false, isEndorsement: false },
      });
      updateData.stage = remainingReviews > 0 ? 'Needs Review' : (newEndorsements > 0 ? 'Endorsed' : 'Idea');
    } else {
      updateData.solveCount = Math.max(0, (problem.solveCount || 1) - 1);
      const remainingUnresolved = await prisma.feedback.count({
        where: { problemId, resolved: false, isEndorsement: false },
      });
      if (remainingUnresolved === 0) {
        updateData.stage = (problem.endorsements || 0) > 0 ? 'Endorsed' : 'Idea';
      }
    }
    await prisma.problem.update({ where: { id: problemId }, data: updateData });
    return res.json({ message: 'Feedback successfully removed' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
