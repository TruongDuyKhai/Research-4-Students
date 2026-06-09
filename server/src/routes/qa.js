const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/qa/questions - List questions with search, filters & stats (Public)
router.get('/questions', (req, res) => {
  const { search, subject } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT q.*, u.username, u.avatar, u.full_name,
             (SELECT COUNT(*) FROM qa_answers a WHERE a.question_id = q.id) as answer_count,
             (SELECT COUNT(*) FROM qa_answers a WHERE a.question_id = q.id AND a.is_accepted = 1) as hasAccepted
      FROM qa_questions q
      JOIN users u ON q.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      query += ` AND (q.title LIKE ? OR q.content LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    if (subject && subject !== 'All' && subject !== 'Tất cả' && subject !== 'All Subjects') {
      query += ` AND q.subject = ?`;
      params.push(subject);
    }

    // Clone query to get total count
    let countQuery = query.replace(/SELECT q\.\*,.*\(SELECT COUNT\(\*\) FROM qa_answers a WHERE a\.question_id = q\.id AND a\.is_accepted = 1\) as hasAccepted/s, 'SELECT COUNT(*) as count');
    const totalCount = db.prepare(countQuery).get(...params).count;

    // Add ordering and pagination
    query += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const questions = db.prepare(query).all(...params);

    // Get unique subjects currently in use
    const subjects = db.prepare("SELECT DISTINCT subject FROM qa_questions WHERE subject IS NOT NULL AND subject != ''").all().map(s => s.subject);

    res.json({
      questions,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      },
      subjects
    });
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/qa/questions/:id - Get specific question details (Public)
router.get('/questions/:id', (req, res) => {
  const qId = req.params.id;

  try {
    const question = db.prepare(`
      SELECT q.*, u.username, u.avatar, u.full_name,
             (SELECT COUNT(*) FROM qa_answers a WHERE a.question_id = q.id) as answer_count,
             (SELECT COUNT(*) FROM qa_answers a WHERE a.question_id = q.id AND a.is_accepted = 1) as hasAccepted
      FROM qa_questions q
      JOIN users u ON q.user_id = u.id
      WHERE q.id = ?
    `).get(qId);

    if (!question) {
      return res.status(404).json({ error: 'Câu hỏi không tồn tại.' });
    }

    res.json(question);
  } catch (err) {
    console.error('Error fetching question details:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/qa/questions - Create new question (Protected)
router.post('/questions', authenticateToken, (req, res) => {
  const { title, subject, content } = req.body;
  const userId = req.user.id;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Tiêu đề câu hỏi là bắt buộc.' });
  }
  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: 'Chủ đề là bắt buộc.' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Nội dung câu hỏi là bắt buộc.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO qa_questions (user_id, subject, title, content)
      VALUES (?, ?, ?, ?)
    `).run(userId, subject.trim(), title.trim(), content.trim());

    const newQuestion = db.prepare(`
      SELECT q.*, u.username, u.avatar, u.full_name,
             0 as answer_count, 0 as hasAccepted
      FROM qa_questions q
      JOIN users u ON q.user_id = u.id
      WHERE q.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newQuestion);
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/qa/questions/:id/answers - Get answers list for a question (Public)
router.get('/questions/:id/answers', (req, res) => {
  const qId = req.params.id;

  try {
    const answers = db.prepare(`
      SELECT a.*, u.username, u.avatar, u.full_name, u.role
      FROM qa_answers a
      JOIN users u ON a.user_id = u.id
      WHERE a.question_id = ?
      ORDER BY a.is_accepted DESC, a.created_at ASC
    `).all(qId);

    res.json(answers);
  } catch (err) {
    console.error('Error fetching answers:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/qa/questions/:id/answers - Post an answer (Protected)
router.post('/questions/:id/answers', authenticateToken, (req, res) => {
  const qId = req.params.id;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Nội dung trả lời là bắt buộc.' });
  }

  try {
    const question = db.prepare('SELECT * FROM qa_questions WHERE id = ?').get(qId);
    if (!question) {
      return res.status(404).json({ error: 'Câu hỏi không tồn tại.' });
    }

    const result = db.prepare(`
      INSERT INTO qa_answers (question_id, user_id, content, is_accepted)
      VALUES (?, ?, ?, 0)
    `).run(qId, userId, content.trim());

    const newAnswer = db.prepare(`
      SELECT a.*, u.username, u.avatar, u.full_name, u.role
      FROM qa_answers a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    // Send notification to question owner (if answering someone else's question)
    if (question.user_id !== userId) {
      const uploader = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
      const titleShort = question.title.length > 25 ? question.title.substring(0, 25) + '...' : question.title;
      db.prepare(`
        INSERT INTO notifications (user_id, type, message, ref_id)
        VALUES (?, 'qa', ?, ?)
      `).run(question.user_id, `${uploader.full_name} đã trả lời câu hỏi của bạn: "${titleShort}"`, qId);
    }

    res.status(201).json(newAnswer);
  } catch (err) {
    console.error('Error creating answer:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/qa/answers/:id/accept - Accept an answer (Protected, owner only)
router.post('/answers/:id/accept', authenticateToken, (req, res) => {
  const answerId = req.params.id;
  const userId = req.user.id;

  try {
    const answer = db.prepare('SELECT * FROM qa_answers WHERE id = ?').get(answerId);
    if (!answer) {
      return res.status(404).json({ error: 'Câu trả lời không tồn tại.' });
    }

    const question = db.prepare('SELECT * FROM qa_questions WHERE id = ?').get(answer.question_id);
    if (!question) {
      return res.status(404).json({ error: 'Câu hỏi liên quan không tồn tại.' });
    }

    // Check if current user is owner of the question
    if (question.user_id !== userId) {
      return res.status(403).json({ error: 'Bạn không có quyền chấp nhận câu trả lời cho câu hỏi này.' });
    }

    db.transaction(() => {
      // Unaccept all other answers for this question
      db.prepare('UPDATE qa_answers SET is_accepted = 0 WHERE question_id = ?').run(answer.question_id);
      // Accept this answer
      db.prepare('UPDATE qa_answers SET is_accepted = 1 WHERE id = ?').run(answerId);
    })();

    res.json({ message: 'Đã chấp nhận câu trả lời này.' });
  } catch (err) {
    console.error('Error accepting answer:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
