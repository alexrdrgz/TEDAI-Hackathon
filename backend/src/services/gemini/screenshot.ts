import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import { ScreenshotSummary, ScreenshotSummarySchema } from '../../models/index';
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

export async function summarizeScreenshot(
  screenshotPath: string,
  previousSummary?: ScreenshotSummary
): Promise<ScreenshotSummary> {
  return withRetry(async () => {
    const imageBuffer = fs.readFileSync(screenshotPath);
    const imageData = imageBuffer.toString('base64');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    let prompt = `Analyze this screenshot and provide:
1. FullDescription: A 1 paragraph explanation of what is visible. If this is a messaging application, include details about visible message content, senders, and conversation context.
2. Caption: A 1 sentence summary of the image, focusing on which task the user is performing
3. Changes: An array of short snippets of what changed (if there's a previous screenshot context, compare; if not, use empty array)
4. Facts: An array of 0-3 facts that can be learned from the screenshot
5. isMessagingApp: Boolean true if this screenshot shows a messaging/chat application (look for chat bubbles, message threads, conversation interfaces like Slack, WhatsApp, iMessage, Discord, Teams, Telegram, etc.), false otherwise

Return a JSON object with these exact keys.`;

    if (previousSummary) {
      prompt += `\n\nPrevious screenshot summary for context:
Caption: ${previousSummary.Caption}
Previous Changes: ${previousSummary.Changes.join('; ')}

Now describe what CHANGED from that previous state to this new screenshot.`;
    }

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
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = ScreenshotSummarySchema.parse(parsed);

    return validated;
  });
}
