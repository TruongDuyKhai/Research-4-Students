const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reviews - Get list of reviews with search, rating filter, and subject summaries (Public)
router.get('/', (req, res) => {
  const { search, rating } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT r.*, u.username, u.avatar, u.full_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      query += ` AND (r.subject_code LIKE ? OR r.subject_name LIKE ? OR r.content LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (rating && rating !== 'All' && rating !== 'Tất cả') {
      const ratingVal = parseInt(rating);
      if (!isNaN(ratingVal)) {
        query += ` AND r.rating = ?`;
        params.push(ratingVal);
      }
    }

    // Clone query to get total count
    let countQuery = query.replace('SELECT r.*, u.username, u.avatar, u.full_name', 'SELECT COUNT(*) as count');
    const totalCount = db.prepare(countQuery).get(...params).count;

    // Add ordering and pagination
    query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const reviews = db.prepare(query).all(...params);

    // Get subject-wise summaries (average rating, review counts, recent subject name)
    const summaries = db.prepare(`
      SELECT subject_code, MAX(subject_name) as subject_name,
             ROUND(AVG(rating), 1) as avg_rating,
             COUNT(*) as review_count
      FROM reviews
      GROUP BY subject_code
      ORDER BY review_count DESC, avg_rating DESC
    `).all();

    res.json({
      reviews,
      summaries,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching subject reviews:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/reviews - Write new review (Protected)
router.post('/', authenticateToken, (req, res) => {
  const { subject_code, subject_name, rating, content } = req.body;
  const userId = req.user.id;

  if (!subject_code || !subject_code.trim()) {
    return res.status(400).json({ error: 'Mã môn học là bắt buộc. (Subject code is required)' });
  }
  if (!subject_name || !subject_name.trim()) {
    return res.status(400).json({ error: 'Tên môn học là bắt buộc. (Subject name is required)' });
  }
  
  const ratingVal = parseInt(rating);
  if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
    return res.status(400).json({ error: 'Đánh giá phải từ 1 đến 5 sao. (Rating must be 1 to 5)' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Nội dung đánh giá là bắt buộc.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO reviews (user_id, subject_code, subject_name, rating, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, subject_code.trim().toUpperCase(), subject_name.trim(), ratingVal, content.trim());

    const newReview = db.prepare(`
      SELECT r.*, u.username, u.avatar, u.full_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newReview);
  } catch (err) {
    console.error('Error writing review:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/reviews/:id - Delete a review (Protected, author or admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  const reviewId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Đánh giá không tồn tại.' });
    }

    if (review.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền xóa đánh giá này.' });
    }

    db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
    res.json({ message: 'Xóa đánh giá thành công.' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
