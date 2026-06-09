const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { uploadFile } = require('../bot/discordBot');

// In-memory storage — files go directly to Discord CDN
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) &&
        allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed.'));
  }
});

// GET /api/users/check-username - Check username availability (Public)
router.get('/check-username', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username parameter is required.' });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    res.json({ available: !user });
  } catch (err) {
    console.error('Check username error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/users/profile/:id - Fetch profile details (for advisors/teachers or students)
router.get('/profile/:id', authenticateToken, (req, res) => {
  const profileId = req.params.id;

  try {
    const user = db.prepare('SELECT id, username, email, role, full_name, avatar, major, created_at FROM users WHERE id = ? OR username = ?').get(profileId, profileId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    let extraData = {};
    if (user.role === 'advisor' || user.role === 'teacher') {
      // Fetch research projects created by this advisor
      extraData.projects = db.prepare(`
        SELECT p.*, (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as current_members
        FROM projects p 
        WHERE p.created_by = ?
        ORDER BY p.created_at DESC
      `).all(profileId);
    } else if (user.role === 'student') {
      // Fetch projects the student is a member of
      extraData.projects = db.prepare(`
        SELECT p.*, pm.joined_at, u.full_name as advisor_name
        FROM project_members pm
        JOIN projects p ON pm.project_id = p.id
        JOIN users u ON p.created_by = u.id
        WHERE pm.user_id = ?
        ORDER BY pm.joined_at DESC
      `).all(profileId);

      // If viewing their own student profile, also fetch applications
      if (req.user.id == profileId) {
        extraData.applications = db.prepare(`
          SELECT a.*, p.title as project_title, p.department as project_department, u.full_name as advisor_name
          FROM applications a
          JOIN projects p ON a.project_id = p.id
          JOIN users u ON p.created_by = u.id
          WHERE a.user_id = ?
          ORDER BY a.applied_at DESC
        `).all(profileId);
      }
    }

    // Fetch user contribution feeds
    extraData.posts = db.prepare(`
      SELECT p.*, u.full_name, u.username, u.avatar, u.role,
             (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comments_count,
             (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id, profileId);

    extraData.documents = db.prepare(`
      SELECT d.*, u.username, u.avatar, u.full_name
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.user_id = ?
      ORDER BY d.created_at DESC
    `).all(profileId);

    extraData.questions = db.prepare(`
      SELECT q.*, u.username, u.avatar, u.full_name,
             (SELECT COUNT(*) FROM qa_answers a WHERE a.question_id = q.id) as answer_count,
             (SELECT COUNT(*) FROM qa_answers a WHERE a.question_id = q.id AND a.is_accepted = 1) as hasAccepted
      FROM qa_questions q
      JOIN users u ON q.user_id = u.id
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC
    `).all(profileId);

    res.json({
      profile: user,
      ...extraData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/users/profile - Update current user profile
router.put('/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { fullName, major } = req.body;

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  try {
    db.prepare(`
      UPDATE users 
      SET full_name = ?, major = ?
      WHERE id = ?
    `).run(fullName, major || '', userId);

    const updatedUser = db.prepare('SELECT id, username, email, role, full_name, avatar, major FROM users WHERE id = ?').get(userId);
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/users/upload-avatar - Upload avatar image to Discord CDN (Protected)
router.post('/upload-avatar', authenticateToken, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
      const ext = path.extname(req.file.originalname);
      const filename = `avatar-${req.user.id}-${Date.now()}${ext}`;

      const { messageId, fileUrl } = await uploadFile(req.file.buffer, filename);

      db.prepare(`
        UPDATE users SET avatar = ?, avatar_message_id = ? WHERE id = ?
      `).run(fileUrl, messageId, req.user.id);

      res.json({ avatarUrl: fileUrl });
    } catch (uploadErr) {
      console.error('[upload-avatar]', uploadErr);
      res.status(500).json({ error: 'Failed to upload avatar.' });
    }
  });
});

module.exports = router;
