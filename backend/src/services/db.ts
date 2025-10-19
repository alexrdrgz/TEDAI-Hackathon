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

// Enable foreign key constraints in SQLite
db.run('PRAGMA foreign_keys = ON');

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
                    `CREATE TABLE IF NOT EXISTS tasks (
                      id TEXT PRIMARY KEY,
                      type TEXT NOT NULL,
                      data TEXT NOT NULL,
                      status TEXT DEFAULT 'pending',
                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                      handled_at DATETIME
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
                                  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
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
          }
        }
      );
    });
  });
}

export function createTask(id: string, type: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO tasks (id, type, data, status) VALUES (?, ?, ?, 'pending')`,
      [id, type, JSON.stringify(data)],
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function getPendingTasks(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at ASC`,
      (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else {
          const tasks = rows.map(row => ({
            id: row.id,
            type: row.type,
            data: JSON.parse(row.data),
            status: row.status,
            createdAt: row.created_at
          }));
          resolve(tasks);
        }
      }
    );
  });
}

export function markTaskAsHandled(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE tasks SET status = 'handled', handled_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id],
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function getTaskById(id: string): Promise<any | null> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM tasks WHERE id = ?`,
      [id],
      (err: Error | null, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else {
          resolve({
            id: row.id,
            type: row.type,
            data: JSON.parse(row.data),
            status: row.status,
            createdAt: row.created_at
          });
        }
      }
    );
  });
}

export function updateTask(id: string, type: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE tasks SET type = ?, data = ? WHERE id = ?`,
      [type, JSON.stringify(data), id],
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function deleteTask(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM tasks WHERE id = ?`,
      [id],
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
