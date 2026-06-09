const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { uploadFile, refreshFileUrl } = require('../bot/discordBot');

// Keep uploadDir for legacy files already on disk (backward compatibility)
const uploadDir = path.resolve(__dirname, '../../uploads');

// All new uploads go to Discord via memoryStorage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|png|jpg|jpeg|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype) ||
                 file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|png|jpg|jpeg|gif|webp)$/i);
    if (ext || mime) return cb(null, true);
    cb(new Error('Loại file không được hỗ trợ.'));
  }
});

// GET /api/documents - List documents with search and filters (Public)
router.get('/', (req, res) => {
  const { search, subject, type } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT d.*, u.username, u.avatar, u.full_name
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      query += ` AND (d.title LIKE ? OR d.subject LIKE ? OR u.username LIKE ? OR u.full_name LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (subject && subject !== 'All' && subject !== 'Tất cả') {
      query += ` AND d.subject = ?`;
      params.push(subject);
    }

    if (type && type !== 'All' && type !== 'Tất cả') {
      query += ` AND d.type = ?`;
      params.push(type);
    }

    // Clone query to get total count
    let countQuery = query.replace('SELECT d.*, u.username, u.avatar, u.full_name', 'SELECT COUNT(*) as count');
    const totalCount = db.prepare(countQuery).get(...params).count;

    // Add ordering and pagination
    query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const documents = db.prepare(query).all(...params);

    // Get dynamic filter options from database
    const subjects = db.prepare("SELECT DISTINCT subject FROM documents WHERE subject IS NOT NULL AND subject != ''").all().map(s => s.subject);
    const types = db.prepare("SELECT DISTINCT type FROM documents WHERE type IS NOT NULL AND type != ''").all().map(t => t.type);

    res.json({
      documents,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      },
      filters: {
        subjects,
        types
      }
    });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/documents - Upload new document to Discord storage (Protected)
router.post('/', authenticateToken, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn tệp tin cần tải lên.' });

    const { title, subject, type } = req.body;
    const userId = req.user.id;

    if (!title?.trim()) return res.status(400).json({ error: 'Tiêu đề tài liệu là bắt buộc.' });
    if (!subject?.trim()) return res.status(400).json({ error: 'Môn học / Chủ đề là bắt buộc.' });
    if (!type?.trim()) return res.status(400).json({ error: 'Loại tài liệu là bắt buộc.' });

    try {
      const ext = path.extname(req.file.originalname);
      const filename = `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

      const { messageId, fileUrl } = await uploadFile(req.file.buffer, filename);

      const result = db.prepare(`
        INSERT INTO documents 
          (user_id, title, subject, type, file_url, file_size, discord_message_id, file_url_cached_at, downloads)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `).run(userId, title.trim(), subject.trim(), type.trim(), fileUrl, req.file.size, messageId);

      const newDoc = db.prepare(`
        SELECT d.*, u.username, u.avatar, u.full_name
        FROM documents d JOIN users u ON d.user_id = u.id
        WHERE d.id = ?
      `).get(result.lastInsertRowid);

      res.status(201).json(newDoc);
    } catch (uploadErr) {
      console.error('[document upload]', uploadErr);
      res.status(500).json({ error: 'Lỗi khi tải tệp lên Discord. Vui lòng thử lại.' });
    }
  });
});

// GET /api/documents/:id/download - Download file & increment count (Public)
router.get('/:id/download', async (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Tài liệu không tồn tại.' });

    db.prepare('UPDATE documents SET downloads = downloads + 1 WHERE id = ?').run(doc.id);

    // Legacy: no discord_message_id means file lives on disk
    if (!doc.discord_message_id) {
      const filePath = path.join(uploadDir, doc.file_url.replace('/uploads/', ''));
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Tệp tin không tìm thấy.' });
      }
      const ext = path.extname(filePath);
      return res.download(filePath, `${doc.title.replace(/[^a-zA-Z0-9-_]/g, '_')}${ext}`);
    }

    // Check if cached URL needs refresh (older than 6 hours)
    const cachedAt = doc.file_url_cached_at ? new Date(doc.file_url_cached_at) : null;
    const isStale = !cachedAt || (Date.now() - cachedAt.getTime()) > 6 * 60 * 60 * 1000;

    let fileUrl = doc.file_url;

    if (isStale) {
      try {
        fileUrl = await refreshFileUrl(doc.discord_message_id);
        db.prepare(`
          UPDATE documents SET file_url = ?, file_url_cached_at = datetime('now') WHERE id = ?
        `).run(fileUrl, doc.id);
      } catch (refreshErr) {
        console.warn('[download] URL refresh failed, using cached URL:', refreshErr.message);
        // Fall through and use the cached URL anyway
      }
    }

    // Redirect client to Discord CDN — no proxying needed
    res.redirect(fileUrl);
  } catch (err) {
    console.error('[download]', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi tải xuống tài liệu.' });
  }
});

module.exports = router;
