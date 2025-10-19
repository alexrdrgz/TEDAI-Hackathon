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

export interface ActionItem {
  taskType: 'email' | 'calendar' | 'reminder';
  reasoning: string;
  taskData: any;
}

export async function analyzeMessagingForActionItems(
  screenshotPath: string,
  fullDescription: string,
  caption: string
): Promise<ActionItem[]> {
  return withRetry(async () => {
    const imageBuffer = fs.readFileSync(screenshotPath);
    const imageData = imageBuffer.toString('base64');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `You are analyzing a messaging application screenshot to extract actionable items that can be converted into executable tasks.

Context:
- Caption: ${caption}
- Description: ${fullDescription}

Your job is to identify action items from the visible messages and convert them into ACTIONABLE TASKS that can be executed through integrations:

1. **CALENDAR tasks** - For meeting requests, scheduling discussions, or time-based commitments
   - Extract: title, description, startTime (ISO format), endTime, attendees (email addresses if visible), location
   - Example message: "Can we meet tomorrow at 2pm?" → calendar event

2. **EMAIL tasks** - For requests to send information, follow-up communication, or replies needed
   - Extract: to (recipient email or name), subject, body (draft a professional response or email)
   - Example message: "Please send me the report" → draft email with report

3. **REMINDER tasks** - For deadlines, follow-ups, tasks to complete, or things not to forget
   - Extract: title, description, remindAt (ISO timestamp)
   - Example message: "Don't forget the presentation deadline Monday" → reminder
   - Example message: "Can you review the document?" → reminder to review

IMPORTANT GUIDELINES:
- Only extract action items that are clearly actionable and relevant
- For timestamps, use ISO 8601 format and make reasonable assumptions (e.g., "tomorrow at 2pm" → calculate actual datetime)
- Use the current date context: ${new Date().toISOString()}
- If sender information is visible, include it in the task data
- If extracting multiple action items from one message, create separate tasks
- Be selective - don't create tasks for casual conversation or informational messages
- Include enough context in descriptions so the user understands what the task is about

Return a JSON object with this structure:
{
  "actionItems": [
    {
      "taskType": "calendar" | "email" | "reminder",
      "reasoning": "Brief explanation of why this task was created",
      "taskData": {
        // For calendar:
        // { "title": "Meeting Title", "description": "...", "startTime": "ISO timestamp", "endTime": "ISO timestamp", "attendees": ["email@example.com"], "location": "optional" }
        
        // For email:
        // { "to": "recipient@email.com or Name", "subject": "...", "body": "Professional email draft" }
        
        // For reminder:
        // { "title": "Task title", "description": "Details", "remindAt": "ISO timestamp" }
      }
    }
  ]
}

If no actionable items are found, return an empty actionItems array.`;

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
    console.log("analyzeMessagingForActionItems response: ", text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.warn('No JSON found in messaging action items response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return parsed.actionItems || [];
  });
}

