import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        problems: {
          include: {
            feedbacks: true,   // we need needsReview + resolved
          },
        },
      },
    });

    const classifyProblem = (problem) => {
      const feedbacks = problem.feedbacks || [];

      const pendingNeedsReview = feedbacks.some(
        (fb) => fb.needsReview && !fb.resolved
      );

      // 1. On Test (10 pts)
      if (problem.stage === 'On Test') {
        return { category: 'On Test', points: 10 };
      }

      // 2. Approved for Exam (8 pts)
      if (problem.stage === 'Approved for Exam') {
        return { category: 'Approved for Exam', points: 8 };
      }

      // 5. Needs Review (-2 pts)
      if (pendingNeedsReview) {
        return { category: 'Needs Review', points: -2 };
      }

      // 3. Endorsed (5 pts): ≥1 endorsement and no pending needs review
      if ((problem.endorsements || 0) >= 1) {
        return { category: 'Endorsed', points: 5 };
      }

      // 4. Idea (3 pts)
      return { category: 'Idea', points: 3 };
    };

    const leaderboard = users.map((user) => {
      const badges = {
        onTest: 0,
        approved: 0,
        endorsed: 0,
        idea: 0,
        needsReview: 0,
      };

      let score = 0;

      user.problems.forEach((p) => {
        const { category, points } = classifyProblem(p);
        score += points;

        if (category === 'On Test') badges.onTest++;
        else if (category === 'Approved for Exam') badges.approved++;
        else if (category === 'Endorsed') badges.endorsed++;
        else if (category === 'Idea') badges.idea++;
        else if (category === 'Needs Review') badges.needsReview++;
      });

      return {
        userId: user.id,
        author: `${user.firstName} ${user.lastName}`,
        initials: user.initials,
        badges,
        score,
        totalProblems: user.problems.length,
      };
    });

    leaderboard.sort((a, b) => b.score - a.score);
    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Dashboard stats (for current user)
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      where: { authorId: req.userId },
      select: {
        topics: true,
        stage: true,
        quality: true,
        endorsements: true,
        createdAt: true
      }
    });

    const topicCounts = {};
    problems.forEach(p => {
      p.topics.forEach(t => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
    });

    const stageCounts = {};
    let totalEndorsements = 0;
    problems.forEach(p => {
      stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
      totalEndorsements += p.endorsements || 0;
    });

    res.json({
      totalProblems: problems.length,
      totalEndorsements,
      topicCounts,
      stageCounts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Tournament progress (cumulative, for charts)
router.get('/tournament-progress', authenticate, async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        stage: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const progressByDate = {};
    problems.forEach(p => {
      const date = new Date(p.createdAt).toISOString().split('T')[0];
      if (!progressByDate[date]) {
        progressByDate[date] = {
          date,
          idea: 0,
          endorsed: 0,
          onTest: 0,
          published: 0
        };
      }

      if (p.stage === 'Idea') progressByDate[date].idea++;
      else if (p.stage === 'Endorsed') progressByDate[date].endorsed++;
      else if (p.stage === 'On Test') progressByDate[date].onTest++;
      else if (p.stage === 'Published') progressByDate[date].published++;
    });

    const dates = Object.keys(progressByDate).sort();
    const cumulative = [];
    let totals = { idea: 0, endorsed: 0, onTest: 0, published: 0 };

    dates.forEach(date => {
      totals.idea += progressByDate[date].idea;
      totals.endorsed += progressByDate[date].endorsed;
      totals.onTest += progressByDate[date].onTest;
      totals.published += progressByDate[date].published;

      cumulative.push({
        date,
        idea: totals.idea,
        endorsed: totals.endorsed,
        onTest: totals.onTest,
        published: totals.published,
        total: totals.idea + totals.endorsed + totals.onTest + totals.published
      });
    });

    res.json(cumulative);
  } catch (error) {
    console.error('Tournament progress error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament progress' });
  }
});

export default router;
