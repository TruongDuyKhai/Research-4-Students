const { db } = require('../config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

function initSchema() {
  console.log('Initializing SQLite database schema...');

  // Enable foreign key support
  db.pragma('foreign_keys = ON');

  // Create users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      status TEXT DEFAULT 'active',
      avatar TEXT,
      avatar_message_id TEXT,
      major TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create posts table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      tag TEXT,
      likes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create post_likes table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    )
  `).run();

  // Create post_comments table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create documents table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      subject TEXT,
      type TEXT,
      file_url TEXT NOT NULL,
      file_size INTEGER,
      discord_message_id TEXT,
      file_url_cached_at DATETIME,
      downloads INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create qa_questions table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS qa_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create qa_answers table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS qa_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER REFERENCES qa_questions(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_accepted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create reviews table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subject_code TEXT NOT NULL,
      subject_name TEXT,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create forum_threads table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS forum_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create forum_replies table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER REFERENCES forum_threads(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create chat_messages table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create notifications table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      ref_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create site_settings table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();

  // Insert default site settings
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO site_settings (key, value)
    VALUES (?, ?)
  `);

  insertSetting.run('max_accounts', '0');
  insertSetting.run('site_name', 'Research 4 Students');
  console.log('Site settings verified.');

  // Seed default Admin user in new schema if not exists
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminEmail = 'admin@research4students.edu';

  const checkAdmin = db.prepare('SELECT * FROM users WHERE username = ? OR role = ?').get(adminUsername, 'admin');
  if (!checkAdmin) {
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`
      INSERT INTO users (full_name, username, email, password, role, status, avatar, major)
      VALUES (?, ?, ?, ?, 'admin', 'active', '/uploads/avatar_default.png', 'Administration')
    `).run('System Administrator', adminUsername, adminEmail, passwordHash);
    console.log('Seeded default admin user in new schema');
  }


  // --- Migrations for existing databases ---
  // Add Discord storage columns if they don't exist yet (ALTER TABLE is safe to retry)
  const migrations = [
    `ALTER TABLE documents ADD COLUMN discord_message_id TEXT`,
    `ALTER TABLE documents ADD COLUMN file_url_cached_at DATETIME`,
    `ALTER TABLE users ADD COLUMN avatar_message_id TEXT`,
  ];
  for (const sql of migrations) {
    try {
      db.prepare(sql).run();
    } catch (_) {
      // Column already exists — safe to ignore
    }
  }

  console.log('Database schema initialization completed.');
}

module.exports = {
  initSchema
};
