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
          select: { stage: true }
        }
      }
    });

    const leaderboard = users.map(user => {
      const badges = {
        onTest: 0,
        endorsed: 0,
        idea: 0,
        needsReview: 0
      };

      user.problems.forEach(p => {
        if (p.stage === 'On Test') badges.onTest++;
        else if (p.stage === 'Endorsed') badges.endorsed++;
        else if (p.stage === 'Idea') badges.idea++;
        else if (p.stage === 'Needs Review') badges.needsReview++;
      });

      const score = badges.onTest * 6 + badges.endorsed * 5 + badges.idea * 3 - badges.needsReview * 2;

      return {
        userId: user.id,
        author: `${user.firstName} ${user.lastName}`,
        initials: user.initials,
        badges,
        score,
        totalProblems: user.problems.length
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
    problems.forEach(p => {
      stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
    });

    res.json({
      totalProblems: problems.length,
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
