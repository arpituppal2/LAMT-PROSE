import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

const problemInclude = {
  problems: {
    include: {
      author: {
        select: { firstName: true, lastName: true, initials: true }
      }
    }
  }
};

// Create test
router.post('/', authenticate, async (req, res) => {
  try {
    const { competition, name, description, version, problemIds } = req.body;
    const test = await prisma.test.create({
      data: {
        competition,
        name,
        description,
        version,
        problems: { connect: (problemIds || []).map(id => ({ id })) }
      },
      include: problemInclude
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
      include: problemInclude,
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
      include: problemInclude
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// Update test metadata
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { competition, name, description, version } = req.body;
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { competition, name, description, version },
      include: problemInclude
    });
    res.json(test);
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Add a problem to a test
router.post('/:id/problems', authenticate, async (req, res) => {
  try {
    const { problemId } = req.body;
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { problems: { connect: { id: problemId } } },
      include: problemInclude
    });
    res.json(test);
  } catch (error) {
    console.error('Add problem to test error:', error);
    res.status(500).json({ error: 'Failed to add problem to test' });
  }
});

// Remove a problem from a test
router.delete('/:id/problems/:problemId', authenticate, async (req, res) => {
  try {
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: { problems: { disconnect: { id: req.params.problemId } } },
      include: problemInclude
    });
    res.json(test);
  } catch (error) {
    console.error('Remove problem from test error:', error);
    res.status(500).json({ error: 'Failed to remove problem from test' });
  }
});

// Delete a test
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.test.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

export default router;
