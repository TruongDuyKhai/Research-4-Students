const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/chat/users - Return list of users chatted with, last message details, and unread counts (Protected)
router.get('/users', authenticateToken, (req, res) => {
  const currentUserId = req.user.id;

  try {
    // 1. Fetch unique chat contacts (either sent or received messages)
    const contacts = db.prepare(`
      SELECT DISTINCT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id
      FROM chat_messages
      WHERE sender_id = ? OR receiver_id = ?
    `).all(currentUserId, currentUserId, currentUserId);

    const contactList = contacts.map(c => {
      const otherId = c.other_id;
      
      // Get other user's info
      const otherUser = db.prepare('SELECT id, username, full_name, avatar, role FROM users WHERE id = ?').get(otherId);
      if (!otherUser) return null;

      // Get last message between them
      const lastMsg = db.prepare(`
        SELECT * FROM chat_messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at DESC
        LIMIT 1
      `).get(currentUserId, otherId, otherId, currentUserId);

      // Get count of unread messages sent by the other user to the current user
      const unreadCountObj = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages
        WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
      `).get(otherId, currentUserId);

      return {
        user: otherUser,
        lastMessage: lastMsg,
        unreadCount: unreadCountObj ? unreadCountObj.count : 0
      };
    }).filter(Boolean);

    // Sort contacts by last message timestamp (most recent first)
    contactList.sort((a, b) => {
      const dateA = new Date(a.lastMessage ? a.lastMessage.created_at : 0);
      const dateB = new Date(b.lastMessage ? b.lastMessage.created_at : 0);
      return dateB - dateA;
    });

    res.json(contactList);
  } catch (err) {
    console.error('Error fetching chat users:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/chat/:userId/history - Get chat history with another user (Protected)
router.get('/:userId/history', authenticateToken, (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  try {
    const messages = db.prepare(`
      SELECT * FROM chat_messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(currentUserId, otherUserId, otherUserId, currentUserId, limit, offset);

    // Return messages chronologically (oldest first)
    res.json(messages.reverse());
  } catch (err) {
    console.error('Error fetching chat history via REST:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
