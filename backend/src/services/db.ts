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
                else resolve();
              }
            );
          }
        }
      );
    });
  });
}

export async function addSnapshot(
  screenshotPath: string,
  caption: string,
  fullDescription: string,
  changes: string[],
  facts: string[],
  sessionId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO snapshots (screenshot_path, caption, full_description, changes, facts, session_id) VALUES (?, ?, ?, ?, ?, ?)',
      [screenshotPath, caption, fullDescription, JSON.stringify(changes), JSON.stringify(facts), sessionId],
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function getSessionSnapshots(
  sessionId: string
): Promise<Array<{ screenshot_path: string; caption: string; changes: string[]; created_at: string }>> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT screenshot_path, caption, changes, created_at FROM snapshots WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId],
      (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else {
          const processed = (rows || []).map((row) => ({
            screenshot_path: row.screenshot_path,
            caption: row.caption,
            changes: JSON.parse(row.changes),
            created_at: row.created_at,
          }));
          resolve(processed);
        }
      }
    );
  });
}

export async function getLastSessionSnapshot(
  sessionId: string
): Promise<{ caption: string; changes: string[] } | null> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT caption, changes FROM snapshots WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
      [sessionId],
      (err: Error | null, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else
          resolve({
            caption: row.caption,
            changes: JSON.parse(row.changes),
          });
      }
    );
  });
}

export async function getSessionTimeline(sessionId: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT text, timestamp FROM timeline_entries WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId],
      (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else if (!rows || rows.length === 0) resolve(null);
        else {
          const timeline = rows
            .map((row) => {
              const date = new Date(row.timestamp).toLocaleString();
              return `${date}: ${row.text}`;
            })
            .join('\n\n');
          resolve(timeline);
        }
      }
    );
  });
}

export async function addTimelineEntry(
  sessionId: string,
  text: string,
  caption: string,
  timestamp: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO timeline_entries (session_id, text, caption, timestamp) VALUES (?, ?, ?, ?)',
      [sessionId, text, caption, timestamp],
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function getTimelineEntriesForPeriod(
  sessionId: string,
  startTime?: Date,
  endTime?: Date
): Promise<Array<{ text: string; caption: string; timestamp: string }>> {
  return new Promise((resolve, reject) => {
    let query = 'SELECT text, caption, timestamp FROM timeline_entries WHERE session_id = ?';
    const params: any[] = [sessionId];

    if (startTime) {
      query += ' AND timestamp >= ?';
      params.push(startTime.toISOString());
    }
    if (endTime) {
      query += ' AND timestamp <= ?';
      params.push(endTime.toISOString());
    }

    query += ' ORDER BY created_at ASC';

    db.all(query, params, (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}
