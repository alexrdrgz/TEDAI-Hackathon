import { Tool } from './index';
import { db } from '../db';

export const getSnapshotContextTool: Tool = {
  name: 'get_snapshot_context',
  description: 'Get the full context and details of a snapshot by providing a timestamp from the timeline. This allows you to dig deeper into what was happening at a specific point in time.',
  parameters: {
    type: 'object',
    properties: {
      timestamp: {
        type: 'string',
        description: 'The timestamp from a timeline entry to look up (e.g., "2025-10-19 14:35:22"). The tool will find the closest snapshot within a 5 minute window.'
      }
    },
    required: ['timestamp']
  },
  execute: async (input: Record<string, any>): Promise<string> => {
    const timestamp = input.timestamp as string;
    const sessionId = input.sessionId as string;

    if (!sessionId) {
      console.error(`[get_snapshot_context] No active session available.`);
      return 'Error: No active session available.';
    }

    try {
      const targetTime = new Date(timestamp);
      if (isNaN(targetTime.getTime())) {
        console.error(`[get_snapshot_context] Invalid timestamp format "${timestamp}".`);
        return `Error: Invalid timestamp format "${timestamp}". Please use the format shown in the timeline.`;
      }

      // Search for snapshots within 5 minute window (300000 ms)
      const windowMs = 5 * 60 * 1000;
      const minTime = new Date(targetTime.getTime() - windowMs);
      const maxTime = new Date(targetTime.getTime() + windowMs);

      return new Promise((resolve) => {
        db.get(
          `SELECT id, caption, full_description, changes, facts, screenshot_path, created_at 
           FROM snapshots 
           WHERE session_id = ? AND created_at >= ? AND created_at <= ?
           ORDER BY ABS(strftime('%s', created_at) - strftime('%s', ?))
           LIMIT 1`,
          [sessionId, minTime.toISOString(), maxTime.toISOString(), targetTime.toISOString()],
          (err: Error | null, row: any) => {
            if (err) {
              console.error(`[get_snapshot_context] Failed to retrieve snapshot: ${err.message}`);
              resolve(`Error: Failed to retrieve snapshot: ${err.message}`);
              return;
            }

            if (!row) {
              console.error(`[get_snapshot_context] No snapshot found within 5 minutes of timestamp "${timestamp}". This timeline entry may not have an associated snapshot.`);
              resolve(`Error: No snapshot found within 5 minutes of timestamp "${timestamp}". This timeline entry may not have an associated snapshot.`);
              return;
            }

            // Parse JSON fields
            const changes = JSON.parse(row.changes || '[]');
            const facts = JSON.parse(row.facts || '[]');

            const context = {
              caption: row.caption,
              fullDescription: row.full_description,
              changes: changes,
              facts: facts,
              screenshotPath: row.screenshot_path,
              timestamp: row.created_at
            };

            resolve(JSON.stringify(context, null, 2));
          }
        );
      });
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }
};
