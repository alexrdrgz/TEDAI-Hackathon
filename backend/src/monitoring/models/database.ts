import Database from 'better-sqlite3';
import path from 'path';
import * as fs from 'fs';

const dbDir = path.join(__dirname, '../../../../data');
const DB_PATH = path.join(dbDir, 'monitoring.db');

// Create data directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const initDatabase = () => {
  // Snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      screenshot_path TEXT NOT NULL,
      caption TEXT NOT NULL,
      full_description TEXT NOT NULL,
      changes TEXT NOT NULL,
      facts TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Timelines table
  db.exec(`
    CREATE TABLE IF NOT EXISTS timelines (
      session_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_session 
    ON snapshots(session_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_created_at 
    ON snapshots(created_at);
  `);

  console.log('Monitoring database initialized successfully');
};

// Initialize on module load
initDatabase();

// Database operations
export const addSnapshot = (
  screenshotPath: string,
  caption: string,
  fullDescription: string,
  changes: string[],
  facts: string[],
  sessionId: string
): void => {
  const stmt = db.prepare(
    'INSERT INTO snapshots (screenshot_path, caption, full_description, changes, facts, session_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(screenshotPath, caption, fullDescription, JSON.stringify(changes), JSON.stringify(facts), sessionId);
};

export const getSessionSnapshots = (sessionId: string) => {
  const stmt = db.prepare(
    'SELECT screenshot_path, caption, changes, created_at FROM snapshots WHERE session_id = ? ORDER BY created_at ASC'
  );
  const rows = stmt.all(sessionId);
  return rows.map((row: any) => ({
    screenshot_path: row.screenshot_path,
    caption: row.caption,
    changes: JSON.parse(row.changes),
    created_at: row.created_at,
  }));
};

export const getLastSessionSnapshot = (sessionId: string) => {
  const stmt = db.prepare(
    'SELECT caption, changes FROM snapshots WHERE session_id = ? ORDER BY created_at DESC LIMIT 1'
  );
  const row = stmt.get(sessionId) as any;
  if (!row) return null;
  return {
    caption: row.caption,
    changes: JSON.parse(row.changes),
  };
};

export const getSessionTimeline = (sessionId: string): string | null => {
  const stmt = db.prepare('SELECT content FROM timelines WHERE session_id = ?');
  const row = stmt.get(sessionId) as any;
  return row ? row.content : null;
};

export const updateSessionTimeline = (sessionId: string, content: string): void => {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO timelines (session_id, content, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  );
  stmt.run(sessionId, content);
};

export default db;
