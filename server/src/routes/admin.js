const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const isAdmin = require('../middleware/isAdmin');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_secret_here';

// POST /api/admin/login - Separate session using process.env
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUser && password === adminPass) {
    const token = jwt.sign({ role: 'admin' }, ACCESS_TOKEN_SECRET, { expiresIn: '8h' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid administrator credentials.' });
});

// GET /api/admin/verify - Verify admin token
router.get('/verify', isAdmin, (req, res) => {
  res.json({ valid: true });
});

// Protect all following routes with isAdmin middleware
router.use(isAdmin);

// GET /api/admin/stats - Return stats with exact keys requested
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin'").get().count;
    const pendingTeachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND status = 'pending'").get().count;
    const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const totalDocs = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
    const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM qa_questions').get().count;
    const totalReviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;

    res.json({
      total_users: totalUsers,
      pending_teachers: pendingTeachers,
      total_posts: totalPosts,
      total_documents: totalDocs,
      total_questions: totalQuestions,
      total_reviews: totalReviews
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/stats/weekly - New registrations per day this week (Mon–Sun)
router.get('/stats/weekly', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        strftime('%w', created_at) as day_of_week,
        COUNT(*) as count
      FROM users
      WHERE created_at >= date('now', '-7 days')
        AND role != 'admin'
      GROUP BY day_of_week
      ORDER BY day_of_week ASC
    `).all();

    // Map SQLite day 0(Sun)–6(Sat) → T2–CN order [1,2,3,4,5,6,0]
    const order = [1, 2, 3, 4, 5, 6, 0];
    const map = Object.fromEntries(rows.map(r => [r.day_of_week, r.count]));
    const result = order.map(d => map[String(d)] || 0);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/users?status=&role=&search= - Filtered/Paginated list of users
router.get('/users', (req, res) => {
  const { status, role, search } = req.query;
  
  try {
    let sql = "SELECT id, full_name, username, email, role, status, avatar, major, created_at FROM users WHERE role != 'admin'";
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      sql += ' AND (full_name LIKE ? OR username LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY created_at DESC';

    const users = db.prepare(sql).all(...params);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/admin/users/:id/status - Update user status
router.patch('/users/:id/status', (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;

  if (!['active', 'pending', 'banned'].includes(status)) {
    return res.status(400).json({ error: 'Invalid user status.' });
  }

  try {
    const target = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be modified.' });
    }
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
    res.json({ message: 'User status updated successfully.', status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/users/:id - Hard delete user and cascade
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;
  try {
    const target = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted.' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/content/:type/:id - Delete any content item
router.delete('/content/:type/:id', (req, res) => {
  const { type, id } = req.params;

  let tableName = '';
  if (type === 'post') tableName = 'posts';
  else if (type === 'document') tableName = 'documents';
  else if (type === 'question') tableName = 'qa_questions';
  else if (type === 'review') tableName = 'reviews';
  else if (type === 'thread') tableName = 'forum_threads';
  else {
    return res.status(400).json({ error: 'Invalid content type.' });
  }

  try {
    const result = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Content item not found.' });
    }
    res.json({ message: 'Content deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/settings - Get settings map
router.get('/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM site_settings').all();
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/admin/settings - Update site settings (max_accounts, site_name)
router.patch('/settings', (req, res) => {
  const { max_accounts, site_name } = req.body;

  try {
    const updateTransaction = db.transaction(() => {
      if (max_accounts !== undefined) {
        db.prepare(`
          INSERT OR REPLACE INTO site_settings (key, value)
          VALUES ('max_accounts', ?)
        `).run(String(max_accounts));
      }
      if (site_name !== undefined) {
        db.prepare(`
          INSERT OR REPLACE INTO site_settings (key, value)
          VALUES ('site_name', ?)
        `).run(String(site_name));
      }
    });

    updateTransaction();
    res.json({ message: 'Settings updated successfully.' });
  } catch (err) {
    console.error('Settings patch error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/posts
router.get('/posts', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT p.id, p.content, p.tag, p.likes, p.created_at,
             u.full_name as author_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/documents
router.get('/documents', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT d.id, d.title, d.subject, d.type, d.downloads, d.created_at,
             u.full_name as author_name
      FROM documents d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `).all();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/qa
router.get('/qa', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT q.id, q.title, q.content, q.subject, q.created_at,
             u.full_name as author_name
      FROM qa_questions q
      JOIN users u ON q.user_id = u.id
      ORDER BY q.created_at DESC
    `).all();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/reviews
router.get('/reviews', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT r.id, r.content, r.rating, r.subject_code, r.subject_name, r.created_at,
             u.full_name as author_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
