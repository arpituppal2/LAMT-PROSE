import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
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
        isAdmin: true
      }
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
        isAdmin: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
