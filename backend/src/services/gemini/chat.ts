import axios from 'axios';
import dotenv from 'dotenv';
import { db } from '../db';
import { getSessionTimeline } from '../timeline';
import { executeTool, getToolDefinitions } from '../tools';
import { formatToLocalTime } from '../../utils';

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

interface Part {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, any>;
  };
  functionResponse?: {
    name: string;
    response: string | Record<string, any>;
  };
}

interface Content {
  role: 'user' | 'model';
  parts: Part[];
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

IMPORTANT TOOLS YOU HAVE ACCESS TO:
1. 'get_snapshot_context': Dig deeper into any timeline entry by passing the timestamp exactly as shown (e.g., "2025-10-19 14:35:22")
2. 'create_email': Create draft emails for the user to review and send when they need to communicate with someone.
3. 'create_calendar_event': Create calendar events for meetings, reminders, or scheduling tasks.

EDITING WORKFLOW:
- When a user is editing an email or calendar task, help them make changes conversationally
- Ask clarifying questions to understand what they want to change
- After making edits, summarize the final details and ask for explicit confirmation
- Only call the create_email or create_calendar_event tool AFTER the user explicitly confirms (e.g., "yes", "send it", "create it", "looks good")
- Present the final details clearly before asking for confirmation

Full history of the session:
${sessionTimeline}
`;

  if (context.snapshots.length > 0) {
    systemPrompt += `\n\nRecent Screen Activity:\n`;
    context.snapshots.reverse().forEach((snap, idx) => {
      const time = formatToLocalTime(snap.created_at);
      systemPrompt += `\n[${time}] ${snap.caption}`;
      if (snap.facts) {
        systemPrompt += `\nKey facts: ${snap.facts}`;
      }
    });
  }

  if (context.timeline.length > 0) {
    systemPrompt += `\n\nSession Timeline:\n`;
    context.timeline.reverse().forEach((entry) => {
      const time = formatToLocalTime(entry.timestamp);
      systemPrompt += `\n[${time}] ${entry.caption}: ${entry.text}`;
    });
  }

  return systemPrompt;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  sessionId?: string
): Promise<string> {
  const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const maxIterations = 5;
  let iteration = 0;

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
    let contents: Content[] = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const toolDefinitions = getToolDefinitions();

    while (iteration < maxIterations) {
      iteration++;
      console.log(`[ChatResponse:${requestId}] Iteration ${iteration}`);

      // Call Gemini with tools
      const response = await axios.post(
        GEMINI_API_URL,
        {
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents,
          tools: toolDefinitions.length > 0 ? [{ functionDeclarations: toolDefinitions }] : undefined,
          toolConfig: {
            functionCallingConfig: {
              mode: 'AUTO'
            }
          }
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

      const candidate = response.data.candidates?.[0];
      if (!candidate) {
        throw new Error('No response candidate from Gemini API');
      }

      const parts = candidate.content?.parts || [];

      // Extract text response
      const textParts = parts.filter((p: Part) => p.text).map((p: Part) => p.text);
      
      // Extract tool uses
      const toolUses = parts
        .filter((p: Part) => p.functionCall)
        .map((p: Part) => p.functionCall!)
        .filter((toolUse: any): toolUse is { name: string; args: Record<string, any> } => !!toolUse);

      // If no tool calls or finish reason isn't TOOL_CALLS, return text
      if (toolUses.length === 0 || candidate.finishReason !== 'TOOL_CALLS') {
        if (textParts.length > 0) {
          return textParts.join('');
        }
        if (textParts.length === 0 && toolUses.length === 0) {
          console.warn(`[ChatResponse:${requestId}] No text or tool calls in response`);
          return 'I encountered an issue processing your request.';
        }
      }

      console.log(`[ChatResponse:${requestId}] Executing ${toolUses.length} tool(s)`);

      // Execute tools
      const toolResults = [];
      for (const toolUse of toolUses) {
        try {
          // Add sessionId to tool args
          const toolInput = {
            ...toolUse.args,
            sessionId: sessionId || '0'
          };
          const output = await executeTool(toolUse.name, toolInput);
          toolResults.push({
            toolUseId: toolUse.name, // Use tool name as ID for now
            output
          });
        } catch (error: any) {
          toolResults.push({
            toolUseId: toolUse.name,
            output: `Error: ${error.message}`,
            isError: true
          });
        }
      }

      // Add model response to contents
      contents.push({
        role: 'model',
        parts
      });

      // Add tool results to contents
      contents.push({
        role: 'user',
        parts: toolResults.map(result => ({
          functionResponse: {
            name: toolUses.find((t: any) => t.name === result.toolUseId)?.name || 'unknown',
            response: {
              result: result.output
            }
          }
        }))
      });
    }

    throw new Error(`Tool calling exceeded maximum iterations (${maxIterations})`);
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
