import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/testsolve/available
router.get('/available', authenticate, async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      where: { testsolveStatus: 'active', isLocked: true },
      select: {
        id: true,
        name: true,
        competition: true,
        roundType: true,
        roundName: true,
        timeLimit: true,
        testsolveVersion: true,
        numSets: true,
        questionsPerSet: true,
        estimationSets: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tests);
  } catch (error) {
    console.error('Fetch available testsolves error:', error);
    res.status(500).json({ error: 'Failed to fetch available exams' });
  }
});

// POST /api/testsolve/start
router.post('/start', authenticate, async (req, res) => {
  try {
    const { testId, password } = req.body;
    if (!testId || !password) return res.status(400).json({ error: 'testId and password are required.' });

    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        name: true,
        isLocked: true,
        testsolveStatus: true,
        testsolvePassword: true,
        testsolveVersion: true,
        timeLimit: true,
        slots: true,
        numSets: true,
        questionsPerSet: true,
        estimationSets: true,
        problems: { select: { id: true, latex: true } },
      },
    });
    if (!test) return res.status(404).json({ error: 'Exam not found.' });
    if (!test.isLocked) return res.status(400).json({ error: 'This exam is not currently locked for testsolving.' });
    if (test.testsolveStatus !== 'active') return res.status(400).json({ error: 'Testsolving is not currently active for this exam.' });
    if (test.testsolvePassword !== password) return res.status(401).json({ error: 'Incorrect password.' });

    const session = await prisma.testsolveSession.create({
      data: {
        testId,
        userId: req.userId,
        examVersion: test.testsolveVersion,
      },
    });

    // Build ordered problem list from slots
    const slots = Array.isArray(test.slots) ? test.slots : [];
    const problemMap = {};
    test.problems.forEach(p => { problemMap[p.id] = p; });

    const orderedProblems = slots
      .map((s, i) => {
        const pid = s?.problemId;
        const p = pid ? problemMap[pid] : null;
        return p ? { slotIndex: i, problemId: p.id, latex: p.latex } : null;
      })
      .filter(Boolean);

    res.json({
      sessionId: session.id,
      problems: orderedProblems,
      timeLimit: test.timeLimit,
      testName: test.name,
      examMeta: {
        numSets: test.numSets,
        questionsPerSet: test.questionsPerSet,
        estimationSets: test.estimationSets,
        timeLimit: test.timeLimit,
      },
    });
  } catch (error) {
    console.error('Start testsolve error:', error);
    res.status(500).json({ error: 'Failed to start testsolve' });
  }
});

// POST /api/testsolve/session/:sessionId/submit
router.post('/session/:sessionId/submit', authenticate, async (req, res) => {
  try {
    const { responses, overall } = req.body;
    const session = await prisma.testsolveSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.userId !== req.userId) return res.status(403).json({ error: 'Not your session.' });

    await prisma.testsolveProblemResponse.deleteMany({ where: { sessionId: req.params.sessionId } });
    if (responses?.length) {
      await prisma.testsolveProblemResponse.createMany({
        data: responses.map(r => ({
          sessionId: req.params.sessionId,
          problemId: r.problemId,
          slotIndex: r.slotIndex,
          answer: r.answer || '',
          workArea: r.workArea || '',
          comment: r.comment || '',
          timeMinutes: r.timeMinutes != null && r.timeMinutes !== '' ? parseInt(r.timeMinutes) : null,
        })),
      });
    }

    if (overall) {
      await prisma.testsolveOverall.upsert({
        where: { sessionId: req.params.sessionId },
        create: {
          sessionId: req.params.sessionId,
          generalComments: overall.generalComments || '',
          difficultyNotes: overall.difficultyNotes || '',
          techniqueNotes: overall.techniqueNotes || '',
          reworkNotes: overall.reworkNotes || '',
          finalRating: overall.finalRating || 'needs_work',
        },
        update: {
          generalComments: overall.generalComments || '',
          difficultyNotes: overall.difficultyNotes || '',
          techniqueNotes: overall.techniqueNotes || '',
          reworkNotes: overall.reworkNotes || '',
          finalRating: overall.finalRating || 'needs_work',
        },
      });
    }

    await prisma.testsolveSession.update({
      where: { id: req.params.sessionId },
      data: { submittedAt: new Date() },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Submit testsolve error:', error);
    res.status(500).json({ error: 'Failed to submit testsolve' });
  }
});

export default router;
