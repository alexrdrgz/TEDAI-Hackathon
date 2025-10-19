import { db } from './db';
import { formatToLocalTime } from '../utils';

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
              const formatted = formatToLocalTime(row.timestamp);
              return `${formatted}: ${row.text}`;
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
