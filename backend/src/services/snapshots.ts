import { db } from './db';

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
      'INSERT INTO snapshots (screenshot_path, caption, full_description, changes, facts, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [screenshotPath, caption, fullDescription, JSON.stringify(changes), JSON.stringify(facts), sessionId, new Date().toISOString()],
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function getSessionSnapshots(
  sessionId: string
): Promise<Array<{ screenshot_path: string; caption: string; full_description: string; changes: string[]; facts: string[]; created_at: string }>> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT screenshot_path, caption, full_description, changes, facts, created_at FROM snapshots WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId],
      (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else {
          const processed = (rows || []).map((row) => ({
            screenshot_path: row.screenshot_path,
            caption: row.caption,
            full_description: row.full_description,
            changes: JSON.parse(row.changes),
            facts: JSON.parse(row.facts),
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

export async function getAllSnapshots(): Promise<Array<{ screenshot_path: string; caption: string; full_description: string; changes: string[]; facts: string[]; created_at: string }>> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT screenshot_path, caption, full_description, changes, facts, created_at FROM snapshots ORDER BY created_at ASC',
      [],
      (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else {
          const processed = (rows || []).map((row) => ({
            screenshot_path: row.screenshot_path,
            caption: row.caption,
            full_description: row.full_description,
            changes: JSON.parse(row.changes),
            facts: JSON.parse(row.facts),
            created_at: row.created_at,
          }));
          resolve(processed);
        }
      }
    );
  });
}
