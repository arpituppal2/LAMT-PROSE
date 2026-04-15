import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();
const prisma = new PrismaClient();

// Classify problem — uses the actual needsReview boolean on Feedback
const classifyProblem = (problem) => {
  const feedbacks = problem.feedbacks || [];
  const pendingNeedsReview = feedbacks.some(
    (fb) => fb.needsReview === true && !fb.resolved
  );
  if (pendingNeedsReview) return { category: 'needsReview', points: -2 };
  const stage = problem.stage || 'Idea';
  if ((problem.endorsements || 0) >= 1 || stage === 'Endorsed') return { category: 'endorsed', points: 5 };
  return { category: 'idea', points: 3 };
};

// Leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        problems: {
          include: { feedbacks: true },
        },
        feedbacks: {
          select: {
            id: true, problemId: true, isEndorsement: true,
            resolved: true, needsReview: true, createdAt: true,
          },
        },
      },
    });
    const leaderboard = users.map((user) => {
      const badges = { endorsed: 0, idea: 0, needsReview: 0 };
      let score = 0;
      user.problems.forEach((p) => {
        if (p.stage === 'Archived') return;
        const { category, points } = classifyProblem(p);
        score += points;
        badges[category] = (badges[category] || 0) + 1;
      });
      const reviewsGiven = user.feedbacks.length;
      score += reviewsGiven * 0.25;
      score = Math.round(score * 100) / 100;
      return {
        userId: user.id,
        author: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
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
    const stageCounts = { Idea: 0, 'Needs Review': 0, Endorsed: 0 };
    let totalEndorsements = 0;
    problems.forEach((p) => {
      if (p.stage === 'Archived') return;
      p.topics.forEach((t) => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
      const { category } = classifyProblem(p);
      if (category === 'needsReview') stageCounts['Needs Review'] = (stageCounts['Needs Review'] || 0) + 1;
      else if (category === 'endorsed') stageCounts['Endorsed'] = (stageCounts['Endorsed'] || 0) + 1;
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

// Tournament progress (cumulative totals, for charts)
router.get('/tournament-progress', authenticate, async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        stage: true,
        topics: true,
        createdAt: true,
        feedbacks: { select: { resolved: true, isEndorsement: true, needsReview: true } },
        endorsements: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    const progressByDate = {};
    problems.forEach((p) => {
      if (p.stage === 'Archived') return;
      const date = new Date(p.createdAt).toISOString().split('T')[0];
      if (!progressByDate[date]) {
        progressByDate[date] = { date, idea: 0, endorsed: 0, needsReview: 0, count: 0, Algebra: 0, Geometry: 0, Combinatorics: 0, 'Number Theory': 0 };
      }
      const { category } = classifyProblem(p);
      progressByDate[date].count++;
      if (category === 'needsReview') progressByDate[date].needsReview++;
      else if (category === 'endorsed') progressByDate[date].endorsed++;
      else progressByDate[date].idea++;
      (p.topics || []).forEach((t) => {
        if (progressByDate[date][t] !== undefined) progressByDate[date][t]++;
      });
    });
    const dates = Object.keys(progressByDate).sort();
    const cumulative = [];
    let totals = { idea: 0, endorsed: 0, needsReview: 0, count: 0, Algebra: 0, Geometry: 0, Combinatorics: 0, 'Number Theory': 0 };
    dates.forEach((date) => {
      totals.idea += progressByDate[date].idea;
      totals.endorsed += progressByDate[date].endorsed;
      totals.needsReview += progressByDate[date].needsReview;
      totals.count += progressByDate[date].count;
      totals.Algebra += progressByDate[date].Algebra;
      totals.Geometry += progressByDate[date].Geometry;
      totals.Combinatorics += progressByDate[date].Combinatorics;
      totals['Number Theory'] += progressByDate[date]['Number Theory'];
      cumulative.push({ date, ...totals });
    });
    res.json(cumulative);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament progress' });
  }
});

export default router;
