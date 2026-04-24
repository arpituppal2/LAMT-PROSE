import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { computeDisplayStatus } from '../lib/problemDisplayStatus.js';

const router = express.Router();
const prisma = new PrismaClient();

const STATUS_POINTS = {
  Idea: 2,
  'Needs Review': -2,
  Endorsed: 5,
  Resolved: 3,
};

function classifyProblem(problem) {
  const status = computeDisplayStatus(problem);
  if (status === 'Archived') return { category: 'archived', points: 0 };
  const points = STATUS_POINTS[status] ?? 0;
  const category =
    status === 'Idea' ? 'idea'
    : status === 'Needs Review' ? 'needsReview'
    : status === 'Endorsed' ? 'endorsed'
    : status === 'Resolved' ? 'resolved'
    : 'idea';
  return { category, points };
}

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
      const uniqueFeedbacks = Array.from(new Map(user.feedbacks.map((f) => [f.id, f])).values());
      const reviewsGiven = uniqueFeedbacks.length;
      score += reviewsGiven * 0.5;
      score = Math.round(score * 100) / 100;
      return {
        userId: user.id,
        author: `${user.firstName} ${user.lastName}`,
        initials: user.initials,
        badges,
        score,
        totalProblems: user.problems.filter(p => p.stage !== 'Archived').length,
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

// Single user stats — same logic as leaderboard, plus rank
router.get('/user/:id', authenticate, async (req, res) => {
  try {
    // Fetch all users to compute rank (same as leaderboard)
    const users = await prisma.user.findMany({
      include: {
        problems: { include: { feedbacks: true } },
        feedbacks: {
          select: { id: true, problemId: true, isEndorsement: true, resolved: true, createdAt: true },
        },
      },
    });

    const scores = users.map((user) => {
      const badges = { endorsed: 0, idea: 0, needsReview: 0, resolved: 0 };
      let score = 0;
      user.problems.forEach((p) => {
        if (p.stage === 'Archived') return;
        const { category, points } = classifyProblem(p);
        score += points;
        if (badges[category] !== undefined) badges[category] = (badges[category] || 0) + 1;
      });
      const uniqueFeedbacks = Array.from(new Map(user.feedbacks.map((f) => [f.id, f])).values());
      const reviewsGiven = uniqueFeedbacks.length;
      score += reviewsGiven * 0.5;
      score = Math.round(score * 100) / 100;
      return {
        userId: user.id,
        badges,
        score,
        totalProblems: user.problems.filter(p => p.stage !== 'Archived').length,
        reviewsGiven,
      };
    });

    scores.sort((a, b) => b.score - a.score);
    const entry = scores.find(s => s.userId === req.params.id);
    if (!entry) return res.status(404).json({ error: 'User not found' });

    const rank = scores.findIndex(s => s.userId === req.params.id) + 1;
    res.json({ ...entry, rank, total: scores.filter(s => s.score > 0).length });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
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
