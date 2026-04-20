import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();
const prisma = new PrismaClient();

/**
 * Classify a problem for leaderboard scoring.
 * Hierarchy (if/else):
 *   1. Idea       — no feedbacks at all
 *   2. Needs Review — any unresolved non-endorsement feedback
 *   3. Endorsed    — at least 1 endorsement, no unresolved NR feedback
 *   4. Resolved    — had NR feedback, all resolved, no endorsements
 *
 * Points: Idea +2, Needs Review -2, Resolved +3, Endorsed +5
 */
const classifyProblem = (problem) => {
  const feedbacks = problem.feedbacks || [];
  const stage = problem.stage || 'Idea';
  if (stage === 'Archived') return { category: 'archived', points: 0 };

  // No feedbacks at all => Idea
  if (feedbacks.length === 0) {
    return { category: 'idea', points: 2 };
  }

  // Any unresolved non-endorsement feedback => Needs Review
  const hasUnresolved = feedbacks.some(fb => !fb.isEndorsement && !fb.resolved);
  if (hasUnresolved) {
    return { category: 'needsReview', points: -2 };
  }

  // At least 1 endorsement, no unresolved NR => Endorsed
  if ((problem.endorsements || 0) >= 1) {
    return { category: 'endorsed', points: 5 };
  }

  // Had feedback, all resolved, no endorsements => Resolved
  const hadNR = feedbacks.some(fb => !fb.isEndorsement);
  if (hadNR) {
    return { category: 'resolved', points: 3 };
  }

  // Only endorsements (edge case) => Endorsed
  return { category: 'endorsed', points: 5 };
};

// Leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        problems: {
          include: {
            feedbacks: true,
          },
        },
        feedbacks: {
          select: {
            id: true,
            problemId: true,
            isEndorsement: true,
            resolved: true,
            createdAt: true,
          },
        },
      },
    });
    const leaderboard = users.map((user) => {
      const badges = { endorsed: 0, idea: 0, needsReview: 0, resolved: 0 };
      let score = 0;
      user.problems.forEach((p) => {
        if (p.stage === 'Archived') return;
        const { category, points } = classifyProblem(p);
        score += points;
        if (badges[category] !== undefined) badges[category] = (badges[category] || 0) + 1;
      });
      const reviewsGiven = user.feedbacks.length;
      score += reviewsGiven * 0.25;
      score = Math.round(score * 100) / 100;
      return {
        userId: user.id,
        author: `${user.firstName} ${user.lastName}`,
        initials: user.initials,
        badges,
        score,
        totalProblems: user.problems.length,
        reviewsGiven,
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
      include: { feedbacks: true },
    });
    const topicCounts = {};
    const stageCounts = { Idea: 0, 'Needs Review': 0, Endorsed: 0, Resolved: 0 };
    let totalEndorsements = 0;
    problems.forEach((p) => {
      if (p.stage === 'Archived') return;
      p.topics.forEach((t) => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
      const { category } = classifyProblem(p);
      if (category === 'needsReview') stageCounts['Needs Review'] = (stageCounts['Needs Review'] || 0) + 1;
      else if (category === 'endorsed') stageCounts['Endorsed'] = (stageCounts['Endorsed'] || 0) + 1;
      else if (category === 'resolved') stageCounts['Resolved'] = (stageCounts['Resolved'] || 0) + 1;
      else stageCounts['Idea'] = (stageCounts['Idea'] || 0) + 1;
      totalEndorsements += p.endorsements || 0;
    });
    res.json({
      totalProblems: problems.filter(p => p.stage !== 'Archived').length,
      totalEndorsements,
      topicCounts,
      stageCounts,
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
        stage: true, topics: true, createdAt: true,
        feedbacks: { select: { needsReview: true, resolved: true, isEndorsement: true } },
        endorsements: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    const progressByDate = {};
    problems.forEach((p) => {
      if (p.stage === 'Archived') return;
      const date = new Date(p.createdAt).toISOString().split('T')[0];
      if (!progressByDate[date]) {
        progressByDate[date] = { date, idea: 0, endorsed: 0, needsReview: 0, resolved: 0, count: 0, Algebra: 0, Geometry: 0, Combinatorics: 0, 'Number Theory': 0 };
      }
      const { category } = classifyProblem(p);
      progressByDate[date].count++;
      progressByDate[date][category] = (progressByDate[date][category] || 0) + 1;
      (p.topics || []).forEach((t) => { if (progressByDate[date][t] !== undefined) progressByDate[date][t]++; });
    });
    const dates = Object.keys(progressByDate).sort();
    const cumulative = [];
    let totals = { idea: 0, endorsed: 0, needsReview: 0, resolved: 0, count: 0, Algebra: 0, Geometry: 0, Combinatorics: 0, 'Number Theory': 0 };
    dates.forEach((date) => {
      Object.keys(totals).forEach(k => { totals[k] += progressByDate[date][k] || 0; });
      cumulative.push({ date, ...totals });
    });
    res.json(cumulative);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament progress' });
  }
});

export default router;
