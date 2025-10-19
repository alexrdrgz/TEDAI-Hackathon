import { Tool } from './index';
import { db } from '../db';
import { parseLocalTimeToUTC } from '../../utils';

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
      return 'Error: No active session available.';
    }

    try {
      // Validate the timestamp format
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
        console.error(`[get_snapshot_context] Invalid timestamp format "${timestamp}".`);
        return `Error: Invalid timestamp format "${timestamp}". Please use the format shown in the timeline.`;
      }

      // Parse the local time timestamp and convert to UTC ISO string
      const isoTimestamp = parseLocalTimeToUTC(timestamp);
      const windowSec = 5 * 60;

      return new Promise((resolve) => {
        console.log(`[get_snapshot_context] Searching for snapshots - sessionId: "${sessionId}", timestamp: "${timestamp}", window: ${windowSec}s`);
        
        db.get(
          `SELECT id, caption, full_description, changes, facts, screenshot_path, created_at 
           FROM snapshots 
           WHERE ABS(strftime('%s', created_at) - strftime('%s', ?)) <= ?
           ORDER BY ABS(strftime('%s', created_at) - strftime('%s', ?))
           LIMIT 1`,
          [isoTimestamp, windowSec, isoTimestamp],
          (err: Error | null, row: any) => {
            if (err) {
              console.error(`[get_snapshot_context] Failed to retrieve snapshot: ${err.message}`);
              resolve(`Error: Failed to retrieve snapshot: ${err.message}`);
              return;
            }

            if (!row) {
              console.log(`[get_snapshot_context] No snapshot within window. Checking all snapshots for this session...`);
              
              // Find closest snapshot without time constraint
              db.get(
                `SELECT created_at 
                 FROM snapshots 
                 ORDER BY ABS(strftime('%s', created_at) - strftime('%s', ?))
                 LIMIT 1`,
                [isoTimestamp],
                (err: Error | null, closestRow: any) => {
                  if (closestRow) {
                    console.error(`[get_snapshot_context] No snapshot found within 5 minutes of timestamp "${timestamp}". Closest snapshot found at "${closestRow.created_at}".`);
                    resolve(`Error: No snapshot found within 5 minutes of timestamp "${timestamp}". Closest snapshot: ${closestRow.created_at}`);
                  } else {
                    console.error(`[get_snapshot_context] No snapshots at all for sessionId "${sessionId}". Available snapshots for other sessions:`);
                    db.all(`SELECT COUNT(*) as total, COUNT(DISTINCT session_id) as sessions FROM snapshots`, (err, countRows) => {
                      if (!err && countRows && Array.isArray(countRows) && countRows.length > 0) {
                        const countRow = countRows[0] as any;
                        console.error(`[get_snapshot_context] Total snapshots in DB: ${countRow.total}, sessions: ${countRow.sessions}`);
                      }
                    });
                    resolve(`Error: No snapshot found within 5 minutes of timestamp "${timestamp}". This timeline entry may not have an associated snapshot.`);
                  }
                }
              );
              return;
            }

            console.log(`[get_snapshot_context] Found snapshot at "${row.created_at}"`);

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
