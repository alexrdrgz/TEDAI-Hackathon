import sqlite3 from 'sqlite3';
import path from 'path';
import * as fs from 'fs';

const dbDir = path.join(__dirname, '../../data');
const dbPath = path.join(dbDir, 'database.db');

// Create data directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath);

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          screenshot_path TEXT NOT NULL,
          caption TEXT NOT NULL,
          full_description TEXT NOT NULL,
          changes TEXT NOT NULL,
          facts TEXT NOT NULL,
          session_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err: Error | null) => {
          if (err) reject(err);
          else {
            db.run(
              `CREATE TABLE IF NOT EXISTS timeline_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                text TEXT NOT NULL,
                caption TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )`,
              (err: Error | null) => {
                if (err) reject(err);
                else {
                  db.run(
                    `CREATE TABLE IF NOT EXISTS chat_sessions (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      session_id TEXT UNIQUE NOT NULL,
                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`,
                    (err: Error | null) => {
                      if (err) reject(err);
                      else {
                        db.run(
                          `CREATE TABLE IF NOT EXISTS chat_messages (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            session_id TEXT NOT NULL,
                            role TEXT NOT NULL,
                            content TEXT NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
                          )`,
                          (err: Error | null) => {
                            if (err) reject(err);
                            else resolve();
                          }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  });
}
