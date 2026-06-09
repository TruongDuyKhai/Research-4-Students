const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const registerChatHandler = require('./chatHandler');
const registerNotificationHandler = require('./notificationHandler');
const { db } = require('../config/db');
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_secret_here';

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Auth middleware: verify access token from handshake.auth.token or query
  io.use((socket, next) => {
    try {
      let token = null;
      if (socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      } else if (socket.handshake.query && socket.handshake.query.token) {
        token = socket.handshake.query.token;
      }

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return next(new Error('Authentication error: Token invalid'));
        }
        socket.userId = decoded.id;
        socket.user = decoded; // Attach full user details for socket handlers
        next();
      });
    } catch (err) {
      console.error('Socket authentication middleware error:', err);
      next(new Error('Authentication error: Internal error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`Socket user connected: ${userId}, Socket ID: ${socket.id}`);

    // Join personal private room user_${userId}
    socket.join(`user_${userId}`);

    // Register Handlers
    registerChatHandler(io, socket);
    registerNotificationHandler(io, socket);

    // ============================================
    // KEEP EXISTING PROJECT CHAT FOR COLLABORATION
    // ============================================
    socket.on('join_project', ({ projectId }) => {
      try {
        const project = db.prepare('SELECT created_by FROM projects WHERE id = ?').get(projectId);
        if (!project) {
          return socket.emit('error_message', 'Project not found');
        }

        const isMember = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
        
        if (isMember || project.created_by === userId || socket.user.role === 'admin') {
          socket.join(`project_${projectId}`);
          console.log(`User ${userId} joined room project_${projectId}`);
        } else {
          socket.emit('error_message', 'Access denied. You are not a member of this project.');
        }
      } catch (err) {
        console.error(err);
        socket.emit('error_message', 'Database lookup error');
      }
    });

    socket.on('leave_project', ({ projectId }) => {
      socket.leave(`project_${projectId}`);
      console.log(`User ${userId} left room project_${projectId}`);
    });

    socket.on('send_message', ({ projectId, message }) => {
      if (!message || message.trim() === '') return;

      try {
        const result = db.prepare(`
          INSERT INTO messages (project_id, user_id, message)
          VALUES (?, ?, ?)
        `).run(projectId, userId, message.trim());

        const userObj = db.prepare('SELECT full_name, role, avatar FROM users WHERE id = ?').get(userId);

        const newMessage = {
          id: result.lastInsertRowid,
          project_id: parseInt(projectId),
          user_id: userId,
          message: message.trim(),
          created_at: new Date().toISOString(),
          sender_name: userObj.full_name,
          sender_avatar: userObj.avatar || '/uploads/avatar_default.png',
          sender_role: userObj.role
        };

        io.to(`project_${projectId}`).emit('receive_message', newMessage);

        // Notify other project members
        const members = db.prepare('SELECT user_id FROM project_members WHERE project_id = ? AND user_id != ?').all(projectId, userId);
        const project = db.prepare('SELECT title FROM projects WHERE id = ?').get(projectId);
        
        members.forEach((member) => {
          io.to(`user_${member.user_id}`).emit('new_notification', {
            id: Date.now(),
            message: `New message in "${project.title}" from ${userObj.full_name}`,
            type: 'message',
            is_read: 0,
            created_at: new Date().toISOString()
          });
        });
      } catch (err) {
        console.error('Failed to send project message:', err);
        socket.emit('error_message', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket user disconnected: ${userId}, Socket ID: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocket;
