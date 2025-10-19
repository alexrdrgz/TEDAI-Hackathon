import { GoogleGenerativeAI } from '@google/generative-ai';
import { TimelineEntrySchema } from '../../models/index';
import { withRetry } from '../retry';
import { db } from '../db';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateSessionTimeline(
  snapshots: Array<{
    caption: string;
    changes: string[];
    created_at: string;
  }>
): Promise<string> {
  return withRetry(async () => {
    const context = snapshots
      .map((snap) => {
        const utcDate = new Date(snap.created_at);
        const localTime = utcDate.toLocaleString();
        const changesText = snap.changes.length
          ? snap.changes.map((c) => `- ${c}`).join('\n')
          : '(No changes from previous)';
        return `[${localTime}]\nTask: ${snap.caption}\nChanges:\n${changesText}`;
      })
      .join('\n\n---\n\n');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const response = await model.generateContent(
      `Based on the following sequence of screenshot captions and changes from a user session, create a detailed timeline of what happened. Format it as a clear chronological narrative that shows the progression of activities.\n\nContext:\n${context}`
    );

    return response.response.text();
  });
}

export async function generateTimelineEntry(
  currentTimeline: string | null,
  caption: string,
  changes: string[],
  createdAt: string
): Promise<string> {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const timestamp = new Date(createdAt).toLocaleString();
    const changesText = changes.length
      ? changes.map((c) => `- ${c}`).join('\n')
      : '(No changes from previous)';

    const currentTimelineContext = currentTimeline
      ? `\n\nCurrent timeline so far:\n${currentTimeline}\n\n---\n\n`
      : '';

    const prompt = `${currentTimelineContext}A new action in the user session occurred at ${timestamp}:
Task: ${caption}
Changes: ${changesText}

Generate ONLY the next entry/paragraph to ADD to the timeline. Do not regenerate the entire timeline. Just provide the new entry that should be appended.

Return a JSON object with:
{
  "entry": "the new timeline entry text"
}`;

    const response = await model.generateContent(prompt);

    const text = response.response.text();
    console.log(text);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = TimelineEntrySchema.parse(parsed);

    return validated.entry;
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
