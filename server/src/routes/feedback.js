import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get next problem for feedback (Least solves + random)
router.get('/next', authenticate, async (req, res) => {
  try {
    // Get all problems not authored by current user and not on test/approved
    const problems = await prisma.problem.findMany({
      where: {
        authorId: { not: req.userId },
        stage: { notIn: ['On Test', 'Approved for Exam'] }, // keep this filter
      },
      include: {
        author: { select: { firstName: true, lastName: true, initials: true } },
        feedbacks: { where: { userId: req.userId } },
      },
    });

    // Filter out problems already reviewed by user
    const unreviewed = problems.filter((p) => p.feedbacks.length === 0);

    if (unreviewed.length === 0) {
      return res.json(null);
    }

    // Find minimum solveCount among unreviewed (treat null/undefined as 0)
    const minSolve = Math.min(...unreviewed.map((p) => p.solveCount ?? 0));

    // Candidates: all unreviewed problems with that minimal solveCount
    const candidates = unreviewed.filter(
      (p) => (p.solveCount ?? 0) === minSolve
    );

    // Randomly pick one candidate
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];

    const { feedbacks, ...problem } = chosen;
    return res.json(problem);
  } catch (error) {
    console.error('Get next problem error:', error);
    return res.status(500).json({ error: 'Failed to fetch next problem' });
  }
});

// Submit feedback / Endorsement
router.post('/', authenticate, async (req, res) => {
  try {
    const { problemId, answer, feedback, timeSpent, isEndorsement } = req.body;

    const problem = await prisma.problem.findUnique({
      where: { id: problemId }
    });

    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    // Check for duplicates
    const existing = await prisma.feedback.findFirst({
      where: {
        problemId,
        userId: req.userId,
        isEndorsement: !!isEndorsement
      }
    });

    if (existing) {
      return res
        .status(400)
        .json({
          error: `Already submitted ${
            isEndorsement ? 'an endorsement' : 'feedback'
          } for this problem`,
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

    // Update problem stats
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

    // NEW: if it has at least 1 endorsement and no pending needs review, set stage
    if (
      isEndorsement &&
      updatedProblem.endorsements >= 1 &&
      updatedProblem.stage === 'Idea'
    ) {
      await prisma.problem.update({
        where: { id: problemId },
        data: { stage: 'Endorsed' },
      });
    }

    // Task 9: Auto-promote to "Live/Ready for Review" after 3 endorsements
    if (
      isEndorsement &&
      updatedProblem.endorsements >= 3 &&
      updatedProblem.stage === 'Review'
    ) {
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

// Get feedback for a problem
router.get('/problem/:problemId', authenticate, async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { problemId: req.params.problemId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            initials: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(feedbacks);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Resolve feedback
router.put('/:id/resolve', authenticate, async (req, res) => {
  try {
    const fb = await prisma.feedback.findUnique({
      where: { id: req.params.id },
      include: { problem: true },
    });

    if (!fb) return res.status(404).json({ error: 'Feedback not found' });
    if (fb.problem.authorId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { resolved: true },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resolve feedback' });
  }
});

export default router;
