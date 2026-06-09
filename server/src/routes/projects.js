const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/projects - Browse all projects with search/filters
router.get('/', (req, res) => {
  const { q, department, tag } = req.query;
  
  try {
    let sql = `
      SELECT p.*, u.full_name as advisor_name, u.avatar as advisor_avatar, u.email as advisor_email,
             (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as current_members
      FROM projects p
      JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR u.full_name LIKE ?)';
      const searchWildcard = `%${q}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    if (department) {
      sql += ' AND p.department = ?';
      params.push(department);
    }

    if (tag) {
      sql += ' AND p.tags LIKE ?';
      params.push(`%${tag}%`);
    }

    sql += ' ORDER BY p.created_at DESC';

    const projects = db.prepare(sql).all(...params);
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/projects/:id - Get detailed project information
router.get('/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  try {
    const project = db.prepare(`
      SELECT p.*, u.full_name as advisor_name, u.avatar as advisor_avatar, u.email as advisor_email, u.bio as advisor_bio,
             (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as current_members
      FROM projects p
      JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Get project members
    const members = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.role, u.avatar, u.skills, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `).all(projectId);

    // Get current user's application status (if student)
    let userApplication = null;
    if (req.user.role === 'student') {
      userApplication = db.prepare(`
        SELECT id, status, cover_letter, applied_at 
        FROM applications 
        WHERE project_id = ? AND user_id = ?
      `).get(projectId, userId);
    }

    res.json({
      project,
      members,
      userApplication
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/projects - Create project (advisors and admins)
router.post('/', authenticateToken, requireRole(['advisor', 'admin']), (req, res) => {
  const { title, description, department, tags, maxMembers } = req.body;
  const createdBy = req.user.id;

  if (!title || !description || !department) {
    return res.status(400).json({ error: 'Title, description, and department are required.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO projects (title, description, department, tags, max_members, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, description, department, tags || '', maxMembers || 5, createdBy);

    // Advisors automatically join as the first member (owner)
    db.prepare(`
      INSERT INTO project_members (project_id, user_id)
      VALUES (?, ?)
    `).run(result.lastInsertRowid, createdBy);

    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/projects/:id - Update project (only project creator or admin)
router.put('/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  const { title, description, department, tags, maxMembers, status } = req.body;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. You do not own this project.' });
    }

    db.prepare(`
      UPDATE projects 
      SET title = ?, description = ?, department = ?, tags = ?, max_members = ?, status = ?
      WHERE id = ?
    `).run(
      title || project.title,
      description || project.description,
      department || project.department,
      tags !== undefined ? tags : project.tags,
      maxMembers || project.max_members,
      status || project.status,
      projectId
    );

    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.json(updatedProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/projects/:id - Delete project (only project creator or admin)
router.delete('/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. You do not own this project.' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/projects/:id/apply - Apply for a project (Students only)
router.post('/:id/apply', authenticateToken, requireRole(['student']), (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  const { coverLetter } = req.body;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.status === 'closed') {
      return res.status(400).json({ error: 'This project is closed for applications.' });
    }

    // Check if user is already a member
    const isMember = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
    if (isMember) {
      return res.status(400).json({ error: 'You are already a member of this project.' });
    }

    // Check if application exists
    const appExists = db.prepare('SELECT * FROM applications WHERE project_id = ? AND user_id = ?').get(projectId, userId);
    if (appExists) {
      return res.status(400).json({ error: 'You have already applied to this project.' });
    }

    db.prepare(`
      INSERT INTO applications (project_id, user_id, cover_letter)
      VALUES (?, ?, ?)
    `).run(projectId, userId, coverLetter || '');

    // Add Notification to project advisor
    const notificationMessage = `${req.user.fullName} applied to your project "${project.title}".`;
    db.prepare(`
      INSERT INTO notifications (user_id, message, type)
      VALUES (?, ?, 'application')
    `).run(project.created_by, notificationMessage);

    res.status(201).json({ message: 'Application submitted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/projects/:id/applications - Get all applications for this project (advisor owner only)
router.get('/:id/applications', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. You do not own this project.' });
    }

    const applications = db.prepare(`
      SELECT a.*, u.full_name as student_name, u.email as student_email, u.avatar as student_avatar, u.skills as student_skills, u.bio as student_bio
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.project_id = ?
      ORDER BY a.applied_at DESC
    `).all(projectId);

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/projects/:id/messages - Get chat messages (must be project member or owner)
router.get('/:id/messages', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if project exists
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Check membership
    const isMember = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
    if (!isMember && project.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You must be a member of this project to view messages.' });
    }

    const messages = db.prepare(`
      SELECT m.*, u.full_name as sender_name, u.avatar as sender_avatar, u.role as sender_role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.project_id = ?
      ORDER BY m.created_at ASC
    `).all(projectId);

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
