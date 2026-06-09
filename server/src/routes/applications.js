const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// PUT /api/applications/:id - Handle application approval/rejection (Advisor only)
router.put('/:id', authenticateToken, (req, res) => {
  const applicationId = req.params.id;
  const userId = req.user.id;
  const { status } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected.' });
  }

  try {
    // Get application details
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Verify project ownership
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(application.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Associated project not found.' });
    }

    if (project.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. You do not own this project.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'This application has already been processed.' });
    }

    // Transactional logic: Update application status and insert to members if approved
    const processApp = db.transaction(() => {
      // Update status
      db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, applicationId);

      if (status === 'approved') {
        // Double check members count vs max members
        const currentMembers = db.prepare('SELECT COUNT(*) as count FROM project_members WHERE project_id = ?').get(application.project_id).count;
        if (currentMembers >= project.max_members) {
          throw new Error('Project has reached its maximum member limit.');
        }

        // Add to project members
        db.prepare(`
          INSERT OR IGNORE INTO project_members (project_id, user_id)
          VALUES (?, ?)
        `).run(application.project_id, application.user_id);
      }

      // Add notification for the student
      const notificationText = status === 'approved' 
        ? `Congratulations! Your application to project "${project.title}" has been approved.` 
        : `Your application to project "${project.title}" has been rejected.`;
      
      db.prepare(`
        INSERT INTO notifications (user_id, message, type)
        VALUES (?, ?, ?)
      `).run(application.user_id, notificationText, 'application');
    });

    try {
      processApp();
      res.json({ message: `Application ${status} successfully.`, status });
    } catch (txErr) {
      return res.status(400).json({ error: txErr.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
