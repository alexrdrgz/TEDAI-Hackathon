// Gemini Service Template
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
