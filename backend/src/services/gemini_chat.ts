import axios from 'axios';
import dotenv from 'dotenv';
import { db } from './db';

dotenv.config();

// Fail fast if API key is not configured
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

/**
 * Fetch recent screen monitoring context for a session
 */
async function getSessionContext(sessionId: string): Promise<SessionContext> {
  return new Promise((resolve, reject) => {
    // Get recent snapshots (last 5)
    db.all(
      `SELECT caption, full_description, facts, created_at 
       FROM snapshots 
       WHERE session_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [sessionId],
      (err, snapshots: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        // Get recent timeline entries (last 5)
        db.all(
          `SELECT text, caption, timestamp 
           FROM timeline_entries 
           WHERE session_id = ? 
           ORDER BY created_at DESC 
           LIMIT 5`,
          [sessionId],
          (err, timeline: any[]) => {
            if (err) {
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

/**
 * Build context-aware system prompt
 */
function buildSystemPrompt(context: SessionContext): string {
  let systemPrompt = `You are a helpful AI assistant with access to the user's recent computer activity. You can provide smart suggestions and help with tasks based on what the user is working on.

Your responses should be:
- Concise and helpful
- Context-aware based on screen activity
- Proactive in suggesting relevant actions
- Professional but friendly`;

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

/**
 * Generate chat response using Gemini API with conversation history and context
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  sessionId?: string
): Promise<string> {
  try {
    // Get session context if sessionId provided
    let context: SessionContext = { snapshots: [], timeline: [] };
    if (sessionId) {
      try {
        context = await getSessionContext(sessionId);
      } catch (err) {
        console.error('Error fetching session context:', err);
        // Continue without context
      }
    }

    const systemPrompt = buildSystemPrompt(context);

    // Convert chat messages to Gemini format
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
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      },
      {
        params: {
          key: GEMINI_API_KEY
        },
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        },
        proxy: false // Explicitly disable proxy to avoid corporate firewall issues
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response from Gemini API');
    }

    return text;
  } catch (error: any) {
    console.error('Error generating chat response:', error.response?.data || error.message);
    throw new Error('Failed to generate chat response');
  }
}

