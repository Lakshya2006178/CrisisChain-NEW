import pool from '../config/db.js';

/**
 * Helper to safely insert a notification and prevent rapid duplicates.
 */
export const insertNotification = async ({
    recipient_id,
    incident_id = null,
    notification_type = 'System',
    title = null,
    message
}) => {
    try {
        if (!recipient_id || !message) return null;

        const defaultTitle = title || `${notification_type} Notification`;

        // Duplicate check within the last 10 seconds
        const [existing] = await pool.query(
            `SELECT notification_id FROM notification 
             WHERE recipient_id = ? 
               AND incident_id <=> ? 
               AND notification_type = ? 
               AND message = ? 
               AND created_at > NOW() - INTERVAL 10 SECOND
             LIMIT 1`,
            [recipient_id, incident_id, notification_type, message]
        );

        if (existing.length > 0) {
            return existing[0].notification_id;
        }

        const [result] = await pool.execute(
            `INSERT INTO notification (recipient_id, incident_id, notification_type, title, message, is_read, read_at)
             VALUES (?, ?, ?, ?, ?, 0, NULL)`,
            [recipient_id, incident_id, notification_type, defaultTitle, message]
        );

        return result.insertId;
    } catch (err) {
        console.warn('Failed to insert notification:', err.message);
        return null;
    }
};

/**
 * Format a notification row for JSON response.
 */
const formatNotificationRow = (row) => ({
    notification_id: row.notification_id,
    id: row.notification_id,
    recipient_id: row.recipient_id,
    incident_id: row.incident_id,
    incident_display_id: row.incident_id ? `AL-${row.incident_id}` : null,
    incident_title: row.incident_title || null,
    incident_status: row.incident_status || null,
    priority_level: row.priority_level || null,
    notification_type: row.notification_type,
    type: row.notification_type,
    title: row.title || `${row.notification_type} Notification`,
    message: row.message,
    is_read: Boolean(row.is_read),
    read_at: row.read_at,
    created_at: row.created_at
});

/**
 * GET /api/notifications
 * Retrieves notifications for the authenticated user.
 */
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const { unread_only, status, limit = 50 } = req.query;
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

        const conditions = ['n.recipient_id = ?'];
        const params = [userId];

        if (unread_only === 'true' || status === 'unread') {
            conditions.push('n.is_read = 0');
        } else if (status === 'read') {
            conditions.push('n.is_read = 1');
        }

        const sql = `
            SELECT 
                n.notification_id,
                n.recipient_id,
                n.incident_id,
                n.notification_type,
                n.title,
                n.message,
                n.is_read,
                n.read_at,
                n.created_at,
                i.title AS incident_title,
                i.incident_status,
                i.priority_level
            FROM notification n
            LEFT JOIN incident i ON n.incident_id = i.incident_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY n.created_at DESC, n.notification_id DESC
            LIMIT ?
        `;

        params.push(parsedLimit);

        const [rows] = await pool.query(sql, params);
        res.json(rows.map(formatNotificationRow));
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
};

/**
 * GET /api/notifications/unread-count
 * Returns unread notification count for the authenticated user.
 */
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const [rows] = await pool.query(
            'SELECT COUNT(*) AS unread_count FROM notification WHERE recipient_id = ? AND is_read = 0',
            [userId]
        );

        res.json({ unread_count: Number(rows[0]?.unread_count || 0) });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ error: 'Failed to fetch unread count.' });
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read. Enforces user ownership.
 */
export const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const rawId = req.params.id;
        const notificationId = parseInt(rawId, 10);

        if (isNaN(notificationId)) {
            return res.status(400).json({ error: 'Invalid notification ID.' });
        }

        // Verify notification exists and belongs to current user
        const [existing] = await pool.query(
            'SELECT notification_id, recipient_id, is_read FROM notification WHERE notification_id = ?',
            [notificationId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: `Notification #${notificationId} not found.` });
        }

        if (existing[0].recipient_id !== userId) {
            return res.status(403).json({ error: 'Access denied: You cannot modify another user\'s notification.' });
        }

        await pool.execute(
            'UPDATE notification SET is_read = 1, read_at = NOW() WHERE notification_id = ?',
            [notificationId]
        );

        const [updatedRows] = await pool.query(`
            SELECT 
                n.notification_id,
                n.recipient_id,
                n.incident_id,
                n.notification_type,
                n.title,
                n.message,
                n.is_read,
                n.read_at,
                n.created_at,
                i.title AS incident_title,
                i.incident_status,
                i.priority_level
            FROM notification n
            LEFT JOIN incident i ON n.incident_id = i.incident_id
            WHERE n.notification_id = ?
        `, [notificationId]);

        res.json({
            message: 'Notification marked as read.',
            notification: formatNotificationRow(updatedRows[0])
        });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'Failed to mark notification as read.' });
    }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Marks all notifications for the authenticated user as read.
 */
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const [result] = await pool.execute(
            'UPDATE notification SET is_read = 1, read_at = NOW() WHERE recipient_id = ? AND is_read = 0',
            [userId]
        );

        res.json({
            message: 'All notifications marked as read.',
            updated_count: result.affectedRows
        });
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        res.status(500).json({ error: 'Failed to mark notifications as read.' });
    }
};

/**
 * DELETE /api/notifications/:id
 * Deletes a notification. Enforces user ownership.
 */
export const deleteNotification = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const rawId = req.params.id;
        const notificationId = parseInt(rawId, 10);

        if (isNaN(notificationId)) {
            return res.status(400).json({ error: 'Invalid notification ID.' });
        }

        const [existing] = await pool.query(
            'SELECT notification_id, recipient_id FROM notification WHERE notification_id = ?',
            [notificationId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: `Notification #${notificationId} not found.` });
        }

        if (existing[0].recipient_id !== userId && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: You cannot delete another user\'s notification.' });
        }

        await pool.execute('DELETE FROM notification WHERE notification_id = ?', [notificationId]);

        res.json({ message: `Notification #${notificationId} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Failed to delete notification.' });
    }
};

/**
 * POST /api/notifications
 * Creates a notification. Admin only, or system broadcast.
 */
export const createNotification = async (req, res) => {
    try {
        const { recipient_id, incident_id, notification_type, title, message } = req.body;

        if (!recipient_id || !message) {
            return res.status(400).json({ error: 'recipient_id and message are required.' });
        }

        const type = notification_type || 'System';
        const notifTitle = title || `${type} Notification`;

        const newId = await insertNotification({
            recipient_id: parseInt(recipient_id, 10),
            incident_id: incident_id ? parseInt(incident_id, 10) : null,
            notification_type: type,
            title: notifTitle,
            message: message.trim()
        });

        if (!newId) {
            return res.status(500).json({ error: 'Failed to create notification.' });
        }

        const [rows] = await pool.query(`
            SELECT 
                n.notification_id,
                n.recipient_id,
                n.incident_id,
                n.notification_type,
                n.title,
                n.message,
                n.is_read,
                n.read_at,
                n.created_at,
                i.title AS incident_title,
                i.incident_status,
                i.priority_level
            FROM notification n
            LEFT JOIN incident i ON n.incident_id = i.incident_id
            WHERE n.notification_id = ?
        `, [newId]);

        res.status(201).json({
            message: 'Notification created successfully.',
            notification: formatNotificationRow(rows[0])
        });
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ error: 'Failed to create notification.' });
    }
};

