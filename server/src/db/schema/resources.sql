CREATE TABLE IF NOT EXISTS research_websites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  access_type TEXT NOT NULL DEFAULT 'free' CHECK(access_type IN ('free','paid')),
  icon_file_id INTEGER,
  target_audience TEXT,
  features TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
