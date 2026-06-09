const { db } = require('../config/db');

module.exports = function registerNotificationHandler(io, socket) {
  const userId = socket.userId;

  // helper to get unread notification count
  const getUnreadCount = (uid) => {
    try {
      const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(uid);
      return result ? result.count : 0;
    } catch (err) {
      console.error('Error getting unread notification count:', err);
      return 0;
    }
  };

  // notification:getAll event - Fetch all notifications for current user
  socket.on('notification:getAll', () => {
    try {
      const notifications = db.prepare(`
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY is_read ASC, created_at DESC
        LIMIT 50
      `).all(userId);

      const unreadCount = getUnreadCount(userId);

      socket.emit('notification:all', {
        notifications,
        unreadCount
      });
    } catch (err) {
      console.error('Error in notification:getAll socket event:', err);
    }
  });

  // notification:markRead event - Mark a single notification as read
  socket.on('notification:markRead', ({ id }) => {
    if (!id) return;

    try {
      db.prepare(`
        UPDATE notifications
        SET is_read = 1
        WHERE id = ? AND user_id = ?
      `).run(id, userId);

      const unreadCount = getUnreadCount(userId);

      // Emit confirmation back
      socket.emit('notification:marked', { id, unreadCount });
    } catch (err) {
      console.error('Error in notification:markRead socket event:', err);
    }
  });

  // notification:markAllRead event - Mark all notifications as read
  socket.on('notification:markAllRead', () => {
    try {
      db.prepare(`
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ?
      `).run(userId);

      // Emit confirmation back with 0 count
      socket.emit('notification:markedAll', { unreadCount: 0 });
    } catch (err) {
      console.error('Error in notification:markAllRead socket event:', err);
    }
  });
};
