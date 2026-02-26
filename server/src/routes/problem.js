import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create problem
router.post('/', authenticate, async (req, res) => {
  try {
    const { latex, topics, quality, solution, answer, notes } = req.body;

    if (!latex || !topics || topics.length === 0 || !quality) {
      return res.status(400).json({ error: 'Missing required fields: latex, topics, quality' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Task 10: Collective problem numbering with 0001 format
    const totalProblems = await prisma.problem.count();
    const problemId = `${user.initials}${String(totalProblems + 1).padStart(4, '0')}`;

    const problem = await prisma.problem.create({
      data: {
        id: problemId,
        authorId: req.userId,
        latex,
        solution: solution || '',
        answer: answer || '',
        notes: notes || '',
        topics,
        quality,
        stage: 'Idea'
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            initials: true
          }
        }
      }
    });

    res.json(problem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create problem', details: error.message });
  }
});

// Get all problems
router.get('/', authenticate, async (req, res) => {
  try {
    const { stage, topic, author, search } = req.query;
    
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true }
    });

    const where = {};
    if (stage) where.stage = stage;
    if (topic) where.topics = { has: topic };
    if (author) where.authorId = author;
    
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { latex: { contains: search, mode: 'insensitive' } }
      ];
    }

    const problems = await prisma.problem.findMany({
      where,
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            initials: true
          }
        },
        tests: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const isAdmin = currentUser?.isAdmin || false;

    const result = problems.map(p => {
      const pData = { ...p };
      const isAuthor = p.authorId === req.userId;

      if (!isAdmin) delete pData.answer;
      // Task 6: Admins can see notes. Task 4: Authors can see notes.
      if (!isAdmin && !isAuthor) delete pData.notes;
      
      return pData;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problems', details: error.message });
  }
});

// Get my problems
router.get('/my', authenticate, async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      where: { authorId: req.userId },
      include: {
        tests: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problems', details: error.message });
  }
});

// Get specific problem
router.get('/:id', authenticate, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true }
    });

    const problem = await prisma.problem.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            initials: true
          }
        },
        feedbacks: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const isAuthor = problem.authorId === req.userId;
    const isAdmin = currentUser?.isAdmin || false;
    const result = { ...problem };

    if (!isAdmin) delete result.answer;
    // Task 6: Admins can see notes. Task 4: Authors can see notes.
    if (!isAdmin && !isAuthor) delete result.notes;

    result._isAuthor = isAuthor;
    result._isAdmin = isAdmin;

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problem', details: error.message });
  }
});

// Update problem
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { latex, topics, quality, stage, solution, answer, notes } = req.body;
    
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true }
    });

    const existing = await prisma.problem.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) return res.status(404).json({ error: 'Problem not found' });

    const isAuthor = existing.authorId === req.userId;
    const isAdmin = currentUser?.isAdmin || false;

    // Task 2: Only author or admin can edit
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updateData = { 
      latex, 
      solution: solution !== undefined ? solution : existing.solution,
      topics, 
      quality, 
      stage 
    };
    
    if (notes !== undefined) updateData.notes = notes;
    if (answer !== undefined) updateData.answer = answer;

    const problem = await prisma.problem.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            initials: true
          }
        }
      }
    });

    res.json(problem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update problem', details: error.message });
  }
});

// Delete problem
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.problem.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) return res.status(404).json({ error: 'Problem not found' });

    if (existing.authorId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.problem.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Problem deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete problem', details: error.message });
  }
});

export default router;
