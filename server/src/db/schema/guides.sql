CREATE TABLE IF NOT EXISTS guides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_id INTEGER NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'free' CHECK(access_level IN ('free','pro')),
  min_level INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
