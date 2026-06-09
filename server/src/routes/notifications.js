const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications - Get user notifications
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(userId);

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/notifications/read - Mark notifications as read
router.put('/read', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { id } = req.body; // If id provided, mark specific, otherwise mark all

  try {
    if (id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    }
    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  try {
    const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(notificationId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
