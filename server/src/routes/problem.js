import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create problem
router.post('/', authenticate, async (req, res) => {
  try {
    const { latex, topics, quality } = req.body;

    // Get user for initials
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    // Get count of user's problems
    const count = await prisma.problem.count({
      where: { authorId: req.userId }
    });

    // Generate ID: Initials + (count + 1)
    const problemId = `${user.initials}${count + 1}`;

    const problem = await prisma.problem.create({
       data : {
        id: problemId,
        authorId: req.userId,
        latex,
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
    console.error('Create problem error:', error);
    res.status(500).json({ error: 'Failed to create problem' });
  }
});

// Get all problems
router.get('/', authenticate, async (req, res) => {
  try {
    const { stage, topic, author, search } = req.query;

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

    res.json(problems);
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// Get user's problems
router.get('/my', authenticate, async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      where: { authorId: req.userId },
      include: {
        tests: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(problems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// Get single problem
router.get('/:id', authenticate, async (req, res) => {
  try {
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
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(problem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

// Update problem
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { latex, topics, quality, stage } = req.body;

    const existing = await prisma.problem.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    if (existing.authorId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const problem = await prisma.problem.update({
      where: { id: req.params.id },
       { latex, topics, quality, stage },
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
    res.status(500).json({ error: 'Failed to update problem' });
  }
});

// Delete problem
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.problem.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    if (existing.authorId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.problem.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Problem deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete problem' });
  }
});

export default router;
