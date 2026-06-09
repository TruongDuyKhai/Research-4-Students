const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Ensure the db file is stored in the server directory
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Enable foreign key support
db.pragma('foreign_keys = ON');

// Initialize database tables specific to project collaboration
function initDb() {

  // Create Projects table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      created_by INTEGER NOT NULL,
      tags TEXT,
      max_members INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Create Applications table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      cover_letter TEXT,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Create Project Members table (for students who are accepted into a project)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(project_id, user_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Create Messages table for project real-time chat
  db.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
}

module.exports = {
  db,
  initDb
};
