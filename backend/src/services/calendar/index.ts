import { CalendarScenario } from '../../data/mockScenarios';
import { CHEAP_MODEL } from '../config';
import { generateContent } from '../../utils/modelUtils';

export async function generateCalendarFromContext(scenario: CalendarScenario): Promise<{
  type: 'calendar';
  data: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    attendees: string[];
    location?: string;
    reminder?: number;
  };
}> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_actual_api_key_here') {
    throw new Error('GEMINI_API_KEY is required. Please set your API key in the .env file.');
  }

  const prompt = `Generate a calendar event based on the following context:

Context: ${scenario.context}
Attendees: ${scenario.attendees.join(', ')}
Tone: ${scenario.tone}
Key Points to Include: ${scenario.keyPoints?.join(', ') || 'None specified'}

Please generate a complete calendar event with:
1. A clear, descriptive event title
2. A detailed description of the event
3. Appropriate start time (tomorrow at a reasonable business hour)
4. Appropriate end time (1-2 hours duration)
5. Location if relevant
6. Reminder time (15 minutes before)

Return your response as a JSON object with this exact format:
{
  "title": "Your generated event title",
  "description": "Your generated event description",
  "startTime": "2024-01-15T14:00:00.000Z",
  "endTime": "2024-01-15T15:00:00.000Z",
  "location": "Conference Room A (optional)",
  "reminder": 15
}

Make sure the event details are professional, contextual, and appropriate for the attendees and context provided.`;

  try {
    const generatedText = await generateContent(CHEAP_MODEL, [
      {
        text: prompt,
      },
    ]);
    
    const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const calendarData = JSON.parse(cleanedText);

    return {
      type: 'calendar',
      data: {
        title: calendarData.title,
        description: calendarData.description,
        startTime: calendarData.startTime,
        endTime: calendarData.endTime,
        attendees: scenario.attendees,
        location: calendarData.location,
        reminder: calendarData.reminder || 15
      }
    };
  } catch (error) {
    console.error('Error generating calendar event:', error);
    throw new Error(`Failed to generate calendar event from context: ${error instanceof Error ? error.message : String(error)}`);
  }
}
