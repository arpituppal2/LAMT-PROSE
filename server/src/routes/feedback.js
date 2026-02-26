import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get next problem for feedback (Priority Queue)
router.get('/next', authenticate, async (req, res) => {
  try {
    // Get all problems not authored by current user
    const problems = await prisma.problem.findMany({
      where: {
        authorId: { not: req.userId }
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            initials: true
          }
        },
        feedbacks: {
          where: { userId: req.userId }
        }
      }
    });

    // Filter out problems already reviewed by user
    const unreviewed = problems.filter(p => p.feedbacks.length === 0);

    if (unreviewed.length === 0) {
      return res.json(null);
    }

    // Topic counts for scarcity
    const allProblems = await prisma.problem.findMany({
      select: { topics: true }
    });

    const topicCounts = {};
    allProblems.forEach(p => {
      p.topics.forEach(t => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
    });

    // Priority algorithm
    const prioritized = unreviewed.map(p => {
      const scarcityScore = p.topics.reduce((sum, topic) => {
        return sum + (1 / (topicCounts[topic] || 1));
      }, 0);
      const ageScore = Date.now() - new Date(p.createdAt).getTime();
      return {
        problem: p,
        priority: (1000 - p.solveCount) * 1000 + scarcityScore * 100 + ageScore / 100000
      };
    });

    prioritized.sort((a, b) => b.priority - a.priority);

    const { feedbacks, ...problem } = prioritized[0].problem;
    res.json(problem);
  } catch (error) {
    console.error('Get next problem error:', error);
    res.status(500).json({ error: 'Failed to fetch next problem' });
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

    // Task 8: Endorsements only allowed in "Review" stage
    if (isEndorsement && problem.stage !== 'Review') {
      return res.status(400).json({ error: 'Endorsements are only allowed when the problem is in the Review stage.' });
    }

    // Check for duplicates
    const existing = await prisma.feedback.findFirst({
      where: {
        problemId,
        userId: req.userId,
        isEndorsement: !!isEndorsement
      }
    });

    if (existing) {
      return res.status(400).json({ error: `Already submitted ${isEndorsement ? 'an endorsement' : 'feedback'} for this problem` });
    }

    const newFeedback = await prisma.feedback.create({
      data: {
        problemId,
        userId: req.userId,
        answer: answer || '',
        feedback: feedback || '',
        timeSpent,
        isEndorsement: !!isEndorsement,
        resolved: false
      }
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
      data: updateData
    });

    // Task 9: Auto-promote to "Live/Ready for Review" after 3 endorsements
    if (isEndorsement && updatedProblem.endorsements >= 3 && updatedProblem.stage === 'Review') {
      await prisma.problem.update({
        where: { id: problemId },
        data: { stage: 'Live/Ready for Review' }
      });
    }

    res.json(newFeedback);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
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
            initials: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Resolve feedback
router.put('/:id/resolve', authenticate, async (req, res) => {
  try {
    const fb = await prisma.feedback.findUnique({
      where: { id: req.params.id },
      include: { problem: true }
    });

    if (!fb) return res.status(404).json({ error: 'Feedback not found' });
    if (fb.problem.authorId !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { resolved: true }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve feedback' });
  }
});

export default router;
