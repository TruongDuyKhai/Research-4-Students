CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('student','teacher')),
  email TEXT NOT NULL UNIQUE,
  google_id TEXT UNIQUE,
  password_hash TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_file_id INTEGER,
  bio TEXT,
  language_pref TEXT NOT NULL DEFAULT 'en',
  theme_pref TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','banned')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  created_by_admin_at TEXT NOT NULL DEFAULT (datetime('now'))
);
