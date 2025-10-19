import { GoogleGenerativeAI } from '@google/generative-ai';
import { TimelineEntrySchema } from '../../models/index';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const delayMs = options.delayMs ?? RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw new Error('Retry exhausted');
}

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
