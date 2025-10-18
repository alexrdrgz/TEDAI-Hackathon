import sqlite3 from 'sqlite3';
import path from 'path';
import * as fs from 'fs';

const dbDir = path.join(__dirname, '../../data');
const dbPath = path.join(dbDir, 'database.db');

// Create data directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          screenshot_path TEXT NOT NULL,
          summary TEXT NOT NULL,
          session_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}

export async function addSnapshot(
  screenshotPath: string,
  summary: string,
  sessionId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO snapshots (screenshot_path, summary, session_id) VALUES (?, ?, ?)',
      [screenshotPath, summary, sessionId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
