import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create test
router.post('/', authenticate, async (req, res) => {
  try {
    const { competition, name, description, version, problemIds } = req.body;

    const test = await prisma.test.create({
       data : {
        competition,
        name,
        description,
        version,
        problems: {
          connect: problemIds.map(id => ({ id }))
        }
      },
      include: {
        problems: {
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
                initials: true
              }
            }
          }
        }
      }
    });

    res.json(test);
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

// Get all tests
router.get('/', authenticate, async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      include: {
        problems: {
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
                initials: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Get single test
router.get('/:id', authenticate, async (req, res) => {
  try {
    const test = await prisma.test.findUnique({
      where: { id: req.params.id },
      include: {
        problems: {
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
                initials: true
              }
            }
          }
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

export default router;
