// Gemini Service Template
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function summarizeScreenshot(screenshotPath: string): Promise<string> {
  // Read the screenshot file
  const imageBuffer = fs.readFileSync(screenshotPath);
  const imageData = imageBuffer.toString('base64');

  // Call Gemini API
  const response = await axios.post(
    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: 'Describe what you see in this screenshot. What is the user doing? What are the main elements visible?'
            },
            {
              inline_data: {
                mime_type: 'image/png',
                data: imageData
              }
            }
          ]
        }
      ]
    }
  );

  return response.data.candidates[0].content.parts[0].text;
}

export async function generateSessionTimeline(
  snapshots: Array<{ screenshot_path: string; summary: string; created_at: string }>
): Promise<string> {
  const context = snapshots
    .map((snap) => {
      const utcDate = new Date(snap.created_at);
      const localTime = utcDate.toLocaleString();
      return `[${localTime}]\n${snap.summary}`;
    })
    .join('\n\n---\n\n');

  const response = await axios.post(
    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: `Based on the following sequence of screenshot summaries from a user session, create a detailed timeline of what happened. Format it as a clear chronological narrative that shows the progression of activities.\n\nContext:\n${context}`
            }
          ]
        }
      ]
    }
  );

  return response.data.candidates[0].content.parts[0].text;
}
