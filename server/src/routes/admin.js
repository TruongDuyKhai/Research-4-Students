const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { usersDb, moderationDb, communityDb, filesDb } = require('../db/connections');
const { requireAuth, requireRole } = require('../middleware');
const usersModel = require('../models/usersModel');

const router = express.Router();

// Helper to format user objects in response (stripping password hash)
function formatUser(user) {
  if (!user) return null;
  const formatted = { ...user };
  delete formatted.password_hash;
  formatted.must_change_password = !!formatted.must_change_password;
  return formatted;
}

// Helper to get reporter info from usersDb
function getReporterInfo(reporterId) {
  if (reporterId === 0) {
    return { id: 0, role: 'admin', username: 'admin', display_name: 'Admin' };
  }
  const user = usersDb.prepare('SELECT id, username, display_name, avatar_file_id FROM users WHERE id = ?').get(reporterId);
  if (!user) return null;
  let avatarUrl = null;
  if (user.avatar_file_id) {
    const file = filesDb.prepare('SELECT cdn_url FROM files WHERE id = ?').get(user.avatar_file_id);
    avatarUrl = file ? file.cdn_url : null;
  }
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: avatarUrl
  };
}

// Apply admin protection to all routes in this router
router.use(requireAuth, requireRole(['admin']));

/* ==========================================
   TEACHER MANAGEMENT
   ========================================== */

/**
 * GET /api/admin/teachers
 * List teachers with details and search query
 */
router.get('/teachers', (req, res) => {
  const { search } = req.query;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const offset = (page - 1) * limit;

  try {
    let baseQuery = `
      FROM users u
      JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.role = 'teacher'
    `;
    const params = [];

    if (search) {
      baseQuery += ` AND (u.email LIKE ? OR u.username LIKE ? OR u.display_name LIKE ? OR tp.employee_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const totalRow = usersDb.prepare(`SELECT COUNT(*) AS total ` + baseQuery).get(...params);
    const total = totalRow ? totalRow.total : 0;

    const queryParams = [...params, limit, offset];
    const teachers = usersDb.prepare(`
      SELECT u.*, tp.employee_code, tp.department, tp.created_by_admin_at
      ` + baseQuery + `
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...queryParams);

    const formattedTeachers = teachers.map(t => formatUser(t));

    return res.status(200).json({
      data: formattedTeachers,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (error) {
    console.error('Failed to list teachers:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while listing teachers'
      }
    });
  }
});

/**
 * POST /api/admin/teachers
 * Create a new teacher user with temporary password and profile
 */
router.post('/teachers', async (req, res) => {
  const { email, display_name, employee_code, department, username } = req.body;

  if (!email || !display_name || !employee_code || !department) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'email, display_name, employee_code, and department are required'
      }
    });
  }

  // Validate unique constraints in usersDb
  const existingEmail = usersDb.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) {
    return res.status(409).json({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'A user with this email already exists'
      }
    });
  }

  const usernameToUse = username || employee_code;
  const existingUsername = usersDb.prepare('SELECT id FROM users WHERE username = ?').get(usernameToUse);
  if (existingUsername) {
    return res.status(409).json({
      error: {
        code: 'USERNAME_ALREADY_EXISTS',
        message: 'A user with this username already exists'
      }
    });
  }

  const existingCode = usersDb.prepare('SELECT user_id FROM teacher_profiles WHERE employee_code = ?').get(employee_code);
  if (existingCode) {
    return res.status(409).json({
      error: {
        code: 'EMPLOYEE_CODE_ALREADY_EXISTS',
        message: 'A teacher profile with this employee code already exists'
      }
    });
  }

  try {
    // Generate temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // Call usersModel transactions to create teacher
    const teacher = usersModel.createTeacher({
      email,
      password_hash: passwordHash,
      username: usernameToUse,
      display_name,
      employee_code,
      department
    });

    const teacherProfile = usersModel.getTeacherProfile(teacher.id);

    return res.status(201).json({
      data: {
        user: {
          ...formatUser(teacher),
          employee_code: teacherProfile.employee_code,
          department: teacherProfile.department
        },
        tempPassword
      }
    });
  } catch (error) {
    console.error('Failed to create teacher:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating teacher user'
      }
    });
  }
});

/**
 * PATCH /api/admin/teachers/:id
 * Update teacher's core details
 */
router.patch('/teachers/:id', (req, res) => {
  const { id } = req.params;
  const { display_name, employee_code, department, email } = req.body;

  try {
    const teacher = usersDb.prepare("SELECT * FROM users WHERE id = ? AND role = 'teacher'").get(id);
    if (!teacher) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Teacher not found'
        }
      });
    }

    const dbTransaction = usersDb.transaction(() => {
      // Update core user attributes
      const userUpdates = [];
      const userValues = [];
      if (display_name !== undefined) {
        userUpdates.push('display_name = ?');
        userValues.push(display_name);
      }
      if (email !== undefined) {
        userUpdates.push('email = ?');
        userValues.push(email);
      }
      if (userUpdates.length > 0) {
        userUpdates.push("updated_at = datetime('now')");
        userValues.push(id);
        usersDb.prepare(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`).run(...userValues);
      }

      // Update teacher profile details
      const profileUpdates = [];
      const profileValues = [];
      if (employee_code !== undefined) {
        profileUpdates.push('employee_code = ?');
        profileValues.push(employee_code);
      }
      if (department !== undefined) {
        profileUpdates.push('department = ?');
        profileValues.push(department);
      }
      if (profileUpdates.length > 0) {
        profileValues.push(id);
        usersDb.prepare(`UPDATE teacher_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`).run(...profileValues);
      }
    });

    dbTransaction();

    const updatedUser = usersDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const updatedProfile = usersModel.getTeacherProfile(id);

    return res.status(200).json({
      data: {
        ...formatUser(updatedUser),
        employee_code: updatedProfile.employee_code,
        department: updatedProfile.department
      }
    });
  } catch (error) {
    console.error('Failed to update teacher:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating teacher information'
      }
    });
  }
});

/**
 * POST /api/admin/teachers/:id/reset-password
 * Reset teacher password to a temporary password
 */
router.post('/teachers/:id/reset-password', async (req, res) => {
  const { id } = req.params;

  try {
    const teacher = usersDb.prepare("SELECT * FROM users WHERE id = ? AND role = 'teacher'").get(id);
    if (!teacher) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Teacher not found'
        }
      });
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    usersDb.prepare(`
      UPDATE users 
      SET password_hash = ?, must_change_password = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, id);

    return res.status(200).json({
      data: {
        tempPassword
      }
    });
  } catch (error) {
    console.error('Failed to reset teacher password:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while resetting password'
      }
    });
  }
});

/**
 * DELETE /api/admin/teachers/:id
 * Administrative ban of teacher (soft deletion)
 */
router.delete('/teachers/:id', (req, res) => {
  const { id } = req.params;

  try {
    const teacher = usersDb.prepare("SELECT * FROM users WHERE id = ? AND role = 'teacher'").get(id);
    if (!teacher) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Teacher not found'
        }
      });
    }

    usersDb.prepare("UPDATE users SET status = 'banned', updated_at = datetime('now') WHERE id = ?").run(id);

    return res.status(200).json({
      data: {
        message: 'Teacher account banned successfully'
      }
    });
  } catch (error) {
    console.error('Failed to ban teacher account:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while banning teacher account'
      }
    });
  }
});

/* ==========================================
   USER MANAGEMENT
   ========================================== */

/**
 * GET /api/admin/users
 * List users (students by default) with filters
 */
router.get('/users', (req, res) => {
  const roleFilter = req.query.role || 'student';
  const { status, search } = req.query;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const offset = (page - 1) * limit;

  try {
    let baseQuery = `FROM users WHERE role = ?`;
    const params = [roleFilter];

    if (status) {
      baseQuery += ` AND status = ?`;
      params.push(status);
    }

    if (search) {
      baseQuery += ` AND (email LIKE ? OR username LIKE ? OR display_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const totalRow = usersDb.prepare(`SELECT COUNT(*) AS total ` + baseQuery).get(...params);
    const total = totalRow ? totalRow.total : 0;

    const queryParams = [...params, limit, offset];
    const users = usersDb.prepare(`
      SELECT *
      ` + baseQuery + `
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...queryParams);

    const formattedUsers = users.map(u => formatUser(u));

    return res.status(200).json({
      data: formattedUsers,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (error) {
    console.error('Failed to list users:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while listing users'
      }
    });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Ban/Unban user account
 */
router.patch('/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'banned'].includes(status)) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: "status must be either 'active' or 'banned'"
      }
    });
  }

  try {
    const user = usersDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    usersDb.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);

    const updatedUser = usersDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return res.status(200).json({
      data: formatUser(updatedUser)
    });
  } catch (error) {
    console.error('Failed to update user status:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating user status'
      }
    });
  }
});

/* ==========================================
   BANNED KEYWORDS (BLACKLIST)
   ========================================== */

/**
 * GET /api/admin/banned-keywords
 * List all banned keywords in blacklist
 */
router.get('/banned-keywords', (req, res) => {
  try {
    const keywords = moderationDb.prepare('SELECT * FROM banned_keywords ORDER BY keyword ASC').all();
    return res.status(200).json({
      data: keywords
    });
  } catch (error) {
    console.error('Failed to list banned keywords:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching banned keywords'
      }
    });
  }
});

/**
 * POST /api/admin/banned-keywords
 * Add a keyword to the blacklist
 */
router.post('/banned-keywords', (req, res) => {
  const { keyword, match_type } = req.body;
  const matchTypeToUse = match_type || 'contains';

  if (!keyword) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'keyword is required'
      }
    });
  }

  if (!['contains', 'exact', 'regex'].includes(matchTypeToUse)) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: "match_type must be either 'contains', 'exact', or 'regex'"
      }
    });
  }

  try {
    const existing = moderationDb.prepare('SELECT id FROM banned_keywords WHERE keyword = ?').get(keyword);
    if (existing) {
      return res.status(409).json({
        error: {
          code: 'KEYWORD_EXISTS',
          message: 'This keyword is already in the blacklist'
        }
      });
    }

    const info = moderationDb.prepare(`
      INSERT INTO banned_keywords (keyword, match_type, created_by)
      VALUES (?, ?, 0)
    `).run(keyword, matchTypeToUse);

    const created = moderationDb.prepare('SELECT * FROM banned_keywords WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json({
      data: created
    });
  } catch (error) {
    console.error('Failed to create banned keyword:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while adding banned keyword'
      }
    });
  }
});

/**
 * DELETE /api/admin/banned-keywords/:id
 * Remove a keyword from the blacklist
 */
router.delete('/banned-keywords/:id', (req, res) => {
  const { id } = req.params;

  try {
    const result = moderationDb.prepare('DELETE FROM banned_keywords WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Banned keyword not found'
        }
      });
    }

    return res.status(200).json({
      data: {
        message: 'Banned keyword deleted successfully'
      }
    });
  } catch (error) {
    console.error('Failed to delete banned keyword:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while deleting banned keyword'
      }
    });
  }
});

/* ==========================================
   VIOLATION REPORTS
   ========================================== */

/**
 * GET /api/admin/reports
 * List moderation reports
 */
router.get('/reports', (req, res) => {
  const statusFilter = req.query.status || 'pending';
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const offset = (page - 1) * limit;

  try {
    const baseQuery = `FROM reports WHERE status = ?`;
    const totalRow = moderationDb.prepare(`SELECT COUNT(*) AS total ` + baseQuery).get(statusFilter);
    const total = totalRow ? totalRow.total : 0;

    const reports = moderationDb.prepare(`
      SELECT *
      ` + baseQuery + `
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(statusFilter, limit, offset);

    const detailedReports = reports.map(r => {
      let postId = null;
      let targetContent = null;
      try {
        if (r.target_type === 'post') {
          const post = communityDb.prepare('SELECT id, title, content FROM posts WHERE id = ?').get(r.target_id);
          if (post) {
            postId = post.id;
            targetContent = post.title || post.content;
          }
        } else if (r.target_type === 'comment') {
          const comment = communityDb.prepare('SELECT id, post_id, content FROM comments WHERE id = ?').get(r.target_id);
          if (comment) {
            postId = comment.post_id;
            targetContent = comment.content;
          }
        }
      } catch (err) {
        console.error('Failed to look up target for report:', err);
      }
      return {
        ...r,
        postId,
        targetContent,
        reporter: getReporterInfo(r.reporter_id)
      };
    });

    return res.status(200).json({
      data: detailedReports,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (error) {
    console.error('Failed to list reports:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while listing reports'
      }
    });
  }
});

/**
 * PATCH /api/admin/reports/:id
 * Resolve/Dismiss moderation report
 */
router.patch('/reports/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: "status must be either 'resolved' or 'dismissed'"
      }
    });
  }

  try {
    const report = moderationDb.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    moderationDb.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);

    const updatedReport = moderationDb.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    return res.status(200).json({
      data: {
        ...updatedReport,
        reporter: getReporterInfo(updatedReport.reporter_id)
      }
    });
  } catch (error) {
    console.error('Failed to update report:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating report status'
      }
    });
  }
});

/* ==========================================
   QUICK CONTENT MODERATION (HIDE)
   ========================================== */

/**
 * PATCH /api/admin/community/posts/:id/hide
 * Hide a post administratively
 */
router.patch('/community/posts/:id/hide', (req, res) => {
  const { id } = req.params;

  try {
    const post = communityDb.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found'
        }
      });
    }

    communityDb.prepare("UPDATE posts SET status = 'hidden', updated_at = datetime('now') WHERE id = ?").run(id);

    return res.status(200).json({
      data: {
        message: 'Post has been hidden successfully'
      }
    });
  } catch (error) {
    console.error('Failed to hide post administratively:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while hiding post'
      }
    });
  }
});

/**
 * PATCH /api/admin/community/comments/:id/hide
 * Hide a comment administratively
 */
router.patch('/community/comments/:id/hide', (req, res) => {
  const { id } = req.params;

  try {
    const comment = communityDb.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!comment) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Comment not found'
        }
      });
    }

    communityDb.prepare("UPDATE comments SET status = 'hidden' WHERE id = ?").run(id);

    return res.status(200).json({
      data: {
        message: 'Comment has been hidden successfully'
      }
    });
  } catch (error) {
    console.error('Failed to hide comment administratively:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while hiding comment'
      }
    });
  }
});

module.exports = router;
