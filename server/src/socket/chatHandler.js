const { db } = require('../config/db');

module.exports = function registerChatHandler(io, socket) {
  const userId = socket.userId;

  // chat:send event - Send a private message
  socket.on('chat:send', ({ receiver_id, content }) => {
    if (!content || !content.trim()) return;
    if (!receiver_id) return;

    try {
      // 1. Insert chat message into database
      const result = db.prepare(`
        INSERT INTO chat_messages (sender_id, receiver_id, content, is_read)
        VALUES (?, ?, ?, 0)
      `).run(userId, receiver_id, content.trim());

      const newMessage = {
        id: result.lastInsertRowid,
        sender_id: userId,
        receiver_id: parseInt(receiver_id),
        content: content.trim(),
        is_read: 0,
        created_at: new Date().toISOString()
      };

      // 2. Broadcast chat message to sender and receiver private rooms
      io.to(`user_${userId}`).emit('chat:message', newMessage);
      io.to(`user_${receiver_id}`).emit('chat:message', newMessage);

      // 3. Create a notification for the receiver
      const senderInfo = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
      const notifMsg = `Bạn nhận được tin nhắn mới từ ${senderInfo?.full_name || 'Người dùng'}`;

      const notifResult = db.prepare(`
        INSERT INTO notifications (user_id, type, message, is_read, ref_id)
        VALUES (?, 'chat', ?, 0, ?)
      `).run(receiver_id, notifMsg, userId);

      const newNotif = {
        id: notifResult.lastInsertRowid,
        user_id: receiver_id,
        type: 'chat',
        message: notifMsg,
        is_read: 0,
        ref_id: userId,
        created_at: new Date().toISOString()
      };

      // 4. Emit the new notification to the receiver's private room
      io.to(`user_${receiver_id}`).emit('notification:new', newNotif);

    } catch (err) {
      console.error('Error in chat:send socket event:', err);
      socket.emit('error_message', 'Không thể gửi tin nhắn.');
    }
  });

  // chat:history event - Fetch private chat history between two users
  socket.on('chat:history', ({ other_user_id, page }) => {
    if (!other_user_id) return;
    const pageNum = parseInt(page) || 1;
    const limit = 30;
    const offset = (pageNum - 1) * limit;

    try {
      const messages = db.prepare(`
        SELECT * FROM chat_messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, other_user_id, other_user_id, userId, limit, offset);

      // Return reverse list so client gets chronological oldest-to-newest order
      socket.emit('chat:history', {
        other_user_id: parseInt(other_user_id),
        messages: messages.reverse(),
        page: pageNum
      });
    } catch (err) {
      console.error('Error fetching chat history via socket:', err);
    }
  });

  // chat:read event - Mark messages from another user as read
  socket.on('chat:read', ({ other_user_id }) => {
    if (!other_user_id) return;

    try {
      db.prepare(`
        UPDATE chat_messages
        SET is_read = 1
        WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
      `).run(other_user_id, userId);

      // Emit read confirmation back to user
      socket.emit('chat:read', { other_user_id: parseInt(other_user_id) });
    } catch (err) {
      console.error('Error marking chat messages read via socket:', err);
    }
  });
};
