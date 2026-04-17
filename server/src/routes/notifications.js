import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/notifications — current user's notifications, newest first
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(notifications);
  } catch (error) {
    console.error('GET /notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (String(notif.userId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PATCH /api/notifications/read-all — mark all current user notifications as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export default router;
