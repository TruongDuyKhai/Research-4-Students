const express = require('express');
const { guidesDb } = require('../db/connections');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getFileById, refreshFileUrl } = require('../services/discordStorage');

const router = express.Router();

/**
 * GET /api/guides
 * Public list of published guides with pagination
 */
router.get('/', (req, res) => {
  const { category, access_level } = req.query;

  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const offset = (page - 1) * limit;

  try {
    let baseQuery = `
      FROM guides g
      WHERE g.status = 'published'
    `;
    const params = [];

    if (category) {
      baseQuery += ` AND g.category = ?`;
      params.push(category);
    }

    if (access_level) {
      if (!['free', 'pro'].includes(access_level)) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'access_level must be "free" or "pro"'
          }
        });
      }
      baseQuery += ` AND g.access_level = ?`;
      params.push(access_level);
    }

    // Get total
    const totalRow = guidesDb.prepare(`SELECT COUNT(*) AS total ` + baseQuery).get(...params);
    const total = totalRow ? totalRow.total : 0;

    // Get rows
    const queryParams = [...params, limit, offset];
    const list = guidesDb.prepare(`
      SELECT g.id, g.title, g.description, g.category, g.access_level
      ` + baseQuery + `
      ORDER BY g.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...queryParams);

    return res.status(200).json({
      data: list,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (error) {
    console.error('Failed to query guides:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while listing guides'
      }
    });
  }
});

/**
 * GET /api/guides/:id
 * Public metadata lookup for a single guide (hides CDN links)
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const guide = guidesDb.prepare('SELECT * FROM guides WHERE id = ? AND status = \'published\'').get(id);
    if (!guide) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Guide not found'
        }
      });
    }

    return res.status(200).json({ data: guide });
  } catch (error) {
    console.error('Failed to get guide metadata:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving guide metadata'
      }
    });
  }
});

/**
 * GET /api/guides/:id/download
 * Protected: Download file attachment.
 * Blocks download with 403 PRO_FEATURE_DEMO if access_level is 'pro' (demo lock).
 */
router.get('/:id/download', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const guide = guidesDb.prepare('SELECT * FROM guides WHERE id = ?').get(id);
    if (!guide) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Guide not found'
        }
      });
    }

    // Demo restriction for Pro features
    if (guide.access_level === 'pro') {
      return res.status(403).json({
        error: {
          code: 'PRO_FEATURE_DEMO',
          message: 'This is a Pro feature (demo). Upgrading is not available yet.'
        }
      });
    }

    // Fetch file details
    let file = getFileById(guide.file_id);
    if (!file) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Associated file attachments not found'
        }
      });
    }

    // Refresh URL if expired
    const now = new Date();
    const isExpired = file.cdn_url_expires_at && new Date(file.cdn_url_expires_at) <= now;
    if (isExpired) {
      try {
        await refreshFileUrl(file);
        file = getFileById(file.id);
      } catch (refreshError) {
        console.error(`Failed to refresh expired CDN URL for file ID ${file.id}:`, refreshError.message);
      }
    }

    return res.status(200).json({
      data: {
        cdn_url: file.cdn_url,
        original_name: file.original_name
      }
    });
  } catch (error) {
    console.error('Failed to download guide:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while preparing download'
      }
    });
  }
});

/**
 * POST /api/guides
 * Admin/Teacher: Create a new guide
 */
router.post('/', requireAuth, requireRole(['admin', 'teacher']), (req, res) => {
  const { title, description, category, file_id, access_level } = req.body;

  if (!title || !file_id) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Title and file_id are required'
      }
    });
  }

  if (access_level && !['free', 'pro'].includes(access_level)) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'access_level must be "free" or "pro"'
      }
    });
  }

  try {
    // Verify file_id exists
    const file = getFileById(file_id);
    if (!file) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'File attachment with this ID does not exist'
        }
      });
    }

    const info = guidesDb.prepare(`
      INSERT INTO guides (
        created_by, title, description, category, file_id, access_level, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'published')
    `).run(
      req.user.id,
      title,
      description || null,
      category || null,
      file_id,
      access_level || 'free'
    );

    const created = guidesDb.prepare('SELECT * FROM guides WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error('Failed to create guide:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating guide'
      }
    });
  }
});

/**
 * PATCH /api/guides/:id
 * Admin/Teacher: Update a guide (owner or admin only)
 */
router.patch('/:id', requireAuth, requireRole(['admin', 'teacher']), (req, res) => {
  const { id } = req.params;
  const { title, description, category, file_id, access_level, status } = req.body;

  try {
    const guide = guidesDb.prepare('SELECT * FROM guides WHERE id = ?').get(id);
    if (!guide) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Guide not found'
        }
      });
    }

    // Authorization checks
    if (req.user.role !== 'admin' && guide.created_by !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to modify this guide'
        }
      });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (file_id !== undefined) {
      const file = getFileById(file_id);
      if (!file) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'File attachment with this ID does not exist'
          }
        });
      }
      updates.push('file_id = ?');
      values.push(file_id);
    }
    if (access_level !== undefined) {
      if (!['free', 'pro'].includes(access_level)) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'access_level must be "free" or "pro"'
          }
        });
      }
      updates.push('access_level = ?');
      values.push(access_level);
    }
    if (status !== undefined) {
      if (!['draft', 'published'].includes(status)) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'status must be "draft" or "published"'
          }
        });
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length > 0) {
      updates.push('updated_at = datetime(\'now\')');
      values.push(id);
      guidesDb.prepare(`UPDATE guides SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = guidesDb.prepare('SELECT * FROM guides WHERE id = ?').get(id);
    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error('Failed to update guide:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating guide'
      }
    });
  }
});

/**
 * DELETE /api/guides/:id
 * Admin/Teacher: Delete a guide (owner or admin only)
 */
router.delete('/:id', requireAuth, requireRole(['admin', 'teacher']), (req, res) => {
  const { id } = req.params;

  try {
    const guide = guidesDb.prepare('SELECT * FROM guides WHERE id = ?').get(id);
    if (!guide) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Guide not found'
        }
      });
    }

    // Authorization checks
    if (req.user.role !== 'admin' && guide.created_by !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this guide'
        }
      });
    }

    guidesDb.prepare('DELETE FROM guides WHERE id = ?').run(id);

    return res.status(200).json({
      data: {
        message: 'Guide deleted successfully'
      }
    });
  } catch (error) {
    console.error('Failed to delete guide:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while deleting guide'
      }
    });
  }
});

module.exports = router;
