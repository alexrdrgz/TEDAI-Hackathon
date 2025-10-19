import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { TimeSummarySchema, TimeSummary } from '../../models';
import { getTimelineEntriesForPeriod } from '../timeline';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateTimeSummary(sessionId: string): Promise<TimeSummary> {
  console.log(`[generateTimeSummary] Starting for session: ${sessionId}`);
  try {
    // Get all timeline entries for the session
    const timelineEntries = await getTimelineEntriesForPeriod(sessionId);
    console.log(`[generateTimeSummary] Found ${timelineEntries?.length || 0} timeline entries`);

    if (!timelineEntries || timelineEntries.length === 0) {
      console.log('[generateTimeSummary] No timeline entries, returning empty summary');
      return {
        categories: [],
        totalActivities: 0,
        summary: 'No activities tracked yet.',
      };
    }

    // Format timeline for the AI
    const timelineText = timelineEntries
      .map((entry) => {
        const time = new Date(entry.timestamp).toLocaleString();
        return `[${time}] ${entry.caption}: ${entry.text}`;
      })
      .join('\n\n');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `Analyze the following timeline of user activities and categorize how their time was spent.

Timeline entries:
${timelineText}

Based on this timeline, create a comprehensive summary of how the user spent their time. Group similar activities into categories (like "Development", "Meetings", "Communication", "Research", etc.) and estimate the percentage of time spent on each category. Make sure percentages add up to approximately 100%.

Return a JSON object with:
- categories: array of objects with category (string), description (string), percentage (number 0-100), and duration (string like "2 hours")
- totalActivities: number of activities tracked
- summary: a brief 1-2 sentence overall summary

Example format:
{
  "categories": [
    {
      "category": "Development",
      "description": "Writing code and debugging",
      "percentage": 60,
      "duration": "3 hours"
    }
  ],
  "totalActivities": 10,
  "summary": "Most time was spent on development work."
}`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = TimeSummarySchema.parse(parsed);

    return validated;
  } catch (error: any) {
    console.error('Error generating time summary:', error);
    throw new Error(`Failed to generate time summary: ${error.message}`);
  }
}
