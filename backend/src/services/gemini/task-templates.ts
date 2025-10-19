import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmailScenario, CalendarScenario } from '../../data/mockScenarios';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateEmailFromContext(scenario: EmailScenario): Promise<{
  type: 'email';
  data: {
    to: string;
    subject: string;
    body: string;
  };
}> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_actual_api_key_here') {
    throw new Error('GEMINI_API_KEY is required. Please set your API key in the .env file.');
  }

  const prompt = `Generate a professional email based on the following context:

Context: ${scenario.context}
Recipient: ${scenario.to}
Tone: ${scenario.tone}
Key Points to Include: ${scenario.keyPoints?.join(', ') || 'None specified'}

Please generate a complete email with:
1. A clear, professional subject line
2. A well-structured email body that follows the context and tone

Return your response as a JSON object with this exact format:
{
  "subject": "Your generated subject line",
  "body": "Your generated email body with proper formatting"
}

Make sure the email is professional, contextual, and addresses all the key points mentioned.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    
    const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const emailData = JSON.parse(cleanedText);

    return {
      type: 'email',
      data: {
        to: scenario.to,
        subject: emailData.subject,
        body: emailData.body
      }
    };
  } catch (error) {
    console.error('Error generating email:', error);
    throw new Error(`Failed to generate email from context: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    
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
