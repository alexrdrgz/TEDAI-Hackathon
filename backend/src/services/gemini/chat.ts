import axios from 'axios';
import dotenv from 'dotenv';
import { db } from '../db';
import { getSessionTimeline } from '../timeline';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ FATAL ERROR: GEMINI_API_KEY environment variable is not set');
  console.error('   Please add GEMINI_API_KEY to your backend/.env file');
  throw new Error('GEMINI_API_KEY is required but not configured');
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionContext {
  snapshots: Array<{
    caption: string;
    full_description: string;
    facts: string;
    created_at: string;
  }>;
  timeline: Array<{
    text: string;
    caption: string;
    timestamp: string;
  }>;
}

async function getSessionContext(sessionId: string): Promise<SessionContext> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT caption, full_description, facts, created_at 
       FROM snapshots 
       WHERE session_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [sessionId],
      (err, snapshots: any[]) => {
        if (err) {
          console.error(`[SessionContext] Error fetching snapshots for session ${sessionId}:`, err);
          reject(err);
          return;
        }

        db.all(
          `SELECT text, caption, timestamp 
           FROM timeline_entries 
           WHERE session_id = ? 
           ORDER BY created_at DESC 
           LIMIT 5`,
          [sessionId],
          (err, timeline: any[]) => {
            if (err) {
              console.error(`[SessionContext] Error fetching timeline for session ${sessionId}:`, err);
              reject(err);
              return;
            }

            resolve({
              snapshots: snapshots || [],
              timeline: timeline || []
            });
          }
        );
      }
    );
  });
}

async function buildSystemPrompt(context: SessionContext): Promise<string> {
  const sessionTimeline = await getSessionTimeline('0');
  let systemPrompt = `You are a helpful AI assistant with access to the user's recent computer activity. You can provide smart suggestions and help with tasks based on what the user is working on.

Your responses should be:
- Concise and helpful
- Context-aware based on screen activity
- Proactive in suggesting relevant actions
- Professional but friendly
Full history of the session:
${sessionTimeline}
`;

  if (context.snapshots.length > 0) {
    systemPrompt += `\n\nRecent Screen Activity:\n`;
    context.snapshots.reverse().forEach((snap, idx) => {
      const time = new Date(snap.created_at).toLocaleString();
      systemPrompt += `\n[${time}] ${snap.caption}`;
      if (snap.facts) {
        systemPrompt += `\nKey facts: ${snap.facts}`;
      }
    });
  }

  if (context.timeline.length > 0) {
    systemPrompt += `\n\nSession Timeline:\n`;
    context.timeline.reverse().forEach((entry) => {
      systemPrompt += `\n[${entry.timestamp}] ${entry.caption}: ${entry.text}`;
    });
  }

  return systemPrompt;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  sessionId?: string
): Promise<string> {
  const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    let context: SessionContext = { snapshots: [], timeline: [] };
    if (sessionId) {
      try {
        context = await getSessionContext(sessionId);
      } catch (err) {
        console.error(`[ChatResponse:${requestId}] Error fetching session context:`, err);
      }
    }

    const systemPrompt = await buildSystemPrompt(context);

    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await axios.post(
      GEMINI_API_URL,
      {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents,
      },
      {
        params: {
          key: GEMINI_API_KEY
        },
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        },
        proxy: false
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error(`[ChatResponse:${requestId}] Empty response from API`, {
        finishReason: response.data.candidates?.[0]?.finishReason,
        hasContent: !!response.data.candidates?.[0]?.content,
        hasParts: !!response.data.candidates?.[0]?.content?.parts,
        usageMetadata: response.data.usageMetadata
      });
      throw new Error('No response text extracted from Gemini API response');
    }

    return text;
  } catch (error: any) {
    console.error(`[ChatResponse:${requestId}] Error generating chat response:`, {
      errorType: error.constructor.name,
      message: error.message,
      code: error.code,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      apiErrorData: error.response?.data,
      requestUrl: error.config?.url,
      requestMethod: error.config?.method,
      timestamp: new Date().toISOString()
    });
    
    if (error.response?.data) {
      console.error(`[ChatResponse:${requestId}] Full API error response:`, JSON.stringify(error.response.data, null, 2));
    }
    
    throw new Error(`Failed to generate chat response: ${error.message}`);
  }
}
