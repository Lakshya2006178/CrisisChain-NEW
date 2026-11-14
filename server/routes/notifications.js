import express from 'express';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
} from '../controllers/notificationController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Authenticated user notification routes (scoped to the logged-in user)
router.get('/', auth, getNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.patch('/mark-all-read', auth, markAllAsRead);
router.post('/mark-all-read', auth, markAllAsRead);
router.patch('/:id/read', auth, markAsRead);
router.post('/:id/read', auth, markAsRead);
router.delete('/:id', auth, deleteNotification);

// Admin-created notification / broadcast
router.post('/', auth, authorize(['admin']), createNotification);

export default router;

