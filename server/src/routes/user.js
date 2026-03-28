import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile (own)
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        initials: true,
        mathExp: true,
        isAdmin: true,
        problems: {
          where: { authorId: req.userId },
          select: {
            id: true,
            latex: true,
            topics: true,
            stage: true,
            quality: true,
            endorsements: true,
            examType: true,
            feedbacks: {
              select: { id: true, needsReview: true, resolved: true, isEndorsement: true },
            },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, mathExp } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { firstName, lastName, mathExp },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        initials: true,
        mathExp: true,
        isAdmin: true,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get public user profile by ID (includes problems written AND reviews given)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        initials: true,
        mathExp: true,
        problems: {
          select: {
            id: true,
            latex: true,
            topics: true,
            stage: true,
            quality: true,
            endorsements: true,
            examType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        feedbacks: {
          where: { isEndorsement: false },
          select: {
            id: true,
            problemId: true,
            resolved: true,
            isEndorsement: true,
            createdAt: true,
            problem: {
              select: { id: true, latex: true, topics: true, stage: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
