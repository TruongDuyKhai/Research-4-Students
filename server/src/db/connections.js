const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Ensure database files directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbNames = ['users', 'community', 'knowledge', 'resources', 'guides', 'files', 'moderation'];
const connections = {};

dbNames.forEach((name) => {
  const dbPath = path.join(dataDir, `${name}.db`);
  const db = new Database(dbPath);

  // Set SQLite configuration
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Load and execute schema SQL
  const schemaPath = path.join(__dirname, 'schema', `${name}.sql`);
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    console.warn(`Schema file not found for database: ${name}`);
  }

  connections[`${name}Db`] = db;
});

module.exports = {
  usersDb: connections.usersDb,
  communityDb: connections.communityDb,
  knowledgeDb: connections.knowledgeDb,
  resourcesDb: connections.resourcesDb,
  guidesDb: connections.guidesDb,
  filesDb: connections.filesDb,
  moderationDb: connections.moderationDb
};
