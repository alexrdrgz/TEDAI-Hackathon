import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
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

export async function checkAndGenerateTask(
  screenshotPath: string,
  caption: string,
  changes: string[],
  currentTimeline: string | null,
  fullDescription: string
): Promise<{
  shouldCreate: boolean;
  taskType?: 'email' | 'calendar' | string;
  reasoning?: string;
  taskData?: any;
} | null> {
  return withRetry(async () => {
    const imageBuffer = fs.readFileSync(screenshotPath);
    const imageData = imageBuffer.toString('base64');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const timelineContext = currentTimeline
      ? `\n\nCurrent timeline so far:\n${currentTimeline}\n\n---\n\n`
      : '';

    const changesText = changes.length
      ? changes.map((c) => `- ${c}`).join('\n')
      : '(No changes from previous)';

    const prompt = `${timelineContext}You are analyzing a user's current screen activity to determine if an actionable task should be created.

Current Activity:
- Task: ${caption}
- full description: ${fullDescription}
- Changes: ${changesText}

Analyze the screenshot and the timeline to decide if an actionable task should be created. Be somewhat careful not to generate suggestions needlessly, but do so when it seems relevant and helpful.

Consider these task types:
- "email": If the user should clearly draft communication with someone through email
- "calendar": If the user is scheduling a meeting, managing calendar events, or should schedule something

If creating an EMAIL task, generate complete email data with subject and body.
If creating a CALENDAR task, generate event details including title, description, times, and attendees.

Return a JSON object with:
{
  "shouldCreate": boolean,
  "taskType": "email" | "calendar" | "other" | null,
  "reasoning": "brief explanation of why or why not to create a task",
  "taskData": { 
    // (leave empty if shouldCreate is false)
    // If email task:
    // {
    //   "to": "recipient@email.com",
    //   "subject": "Generated subject line",
    //   "body": "Generated professional email body"
    // }
    //
    // If calendar task:
    // {
    //   "title": "Meeting title",
    //   "description": "Event description",
    //   "startTime": "ISO timestamp",
    //   "endTime": "ISO timestamp",
    //   "attendees": ["email@example.com"],
    //   "location": "optional location"
    // }
  }
}`;

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageData,
        },
      },
      {
        text: prompt,
      },
    ]);

    const text = response.response.text();
    console.log("checkAndGenerateTask response: ", text);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      shouldCreate: parsed.shouldCreate ?? false,
      taskType: parsed.taskType ?? undefined,
      reasoning: parsed.reasoning ?? undefined,
      taskData: parsed.taskData ?? undefined,
    };
  });
}
