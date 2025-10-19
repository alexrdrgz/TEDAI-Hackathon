import axios from 'axios';
import dotenv from 'dotenv';
import * as fs from 'fs';
import { executeTool, getTaskCreationToolDefinitions } from '../tools';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface Part {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, any>;
  };
}

interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

export async function checkAndGenerateTask(
  screenshotPath: string,
  caption: string,
  changes: string[],
  currentTimeline: string | null,
  fullDescription: string,
  isMessagingApp?: boolean
): Promise<{
  shouldCreate: boolean;
  taskType?: 'email' | 'calendar' | 'reminder' | string;
  reasoning?: string;
  taskData?: any;
  multipleTasks?: Array<{
    taskType: string;
    reasoning: string;
    taskData: any;
  }>;
} | null> {
  return withRetry(async () => {
    if (!GEMINI_API_KEY) {
      console.error('[checkAndGenerateTask] GEMINI_API_KEY not set');
      return null;
    }

    try {
      const imageBuffer = fs.readFileSync(screenshotPath);
      const imageData = imageBuffer.toString('base64');

      const timelineContext = currentTimeline
        ? `\n\nCurrent timeline so far:\n${currentTimeline}\n\n---\n\n`
        : '';

      const changesText = changes.length
        ? changes.map((c) => `- ${c}`).join('\n')
        : '(No changes from previous)';

      const systemPrompt = `You are an AI assistant that analyzes user screen activity to determine if actionable tasks should be created.

Analyze the current activity. If it makes sense to create an email or calendar event based on what the user is doing, use the appropriate tool to create it. Otherwise, simply respond that no task is needed.

Be selective - only create tasks when they would be genuinely helpful.`;

      const userPrompt = `${timelineContext}Analyze this screenshot and determine if a task should be created.

Current Activity:
- Task: ${caption}
- Description: ${fullDescription}
- Changes: ${changesText}
${isMessagingApp ? '- This is a MESSAGING APPLICATION - look for action items in messages' : ''}

Consider these ACTIONABLE TASK TYPES (executable integrations):
- "email": Draft communication via Gmail compose - use when the user should send an email or reply
- "calendar": Create Google Calendar event - use for meetings, scheduling, time-based commitments
- "reminder": Set Google Calendar reminder/task - use for deadlines, follow-ups, tasks to complete, things not to forget

If creating an EMAIL task, generate complete email data with to, subject, and body.
If creating a CALENDAR task, generate event details including title, description, startTime, endTime, and attendees.
If creating a REMINDER task, generate title, description, and remindAt (ISO timestamp).

Return a JSON object with:
{
  "shouldCreate": boolean,
  "taskType": "email" | "calendar" | "reminder" | "other" | null,
  "reasoning": "brief explanation of why or why not to create a task",
  "taskData": { 
    // (leave empty if shouldCreate is false)
    // If email task:
    // {
    //   "to": "recipient@email.com",
    //   "subject": "Generated subject line",
    //   "body": "Generated professional email body"
    // }
    //
    // If calendar task:
    // {
    //   "title": "Meeting title",
    //   "description": "Event description",
    //   "startTime": "ISO timestamp",
    //   "endTime": "ISO timestamp",
    //   "attendees": ["email@example.com"],
    //   "location": "optional location"
    // }
    //
    // If reminder task:
    // {
    //   "title": "Task title",
    //   "description": "Details about what to do",
    //   "remindAt": "ISO timestamp"
    // }
  }
}

If you think an email or calendar event should be created, use the appropriate tool. Otherwise, just say no task is needed.`;

      let contents: Content[] = [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: imageData,
              },
            } as any,
            {
              text: userPrompt,
            },
          ],
        },
      ];

      const toolDefinitions = getTaskCreationToolDefinitions();

      // Single iteration - let AI decide if it needs to call a tool
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
        console.log('[checkAndGenerateTask] No response from Gemini');
        return null;
      }

      const parts = candidate.content?.parts || [];

      // Extract text response
      const textParts = parts.filter((p: Part) => p.text).map((p: Part) => p.text);

      // Extract tool calls
      const toolUses = parts
        .filter((p: Part) => p.functionCall)
        .map((p: Part) => p.functionCall!)
        .filter((toolUse: any): toolUse is { name: string; args: Record<string, any> } => !!toolUse);

      // If no tool calls, just log and return
      if (toolUses.length === 0) {
        const responseText = textParts.join('');
        console.log('[checkAndGenerateTask] No task needed:', responseText);
        return null;
      }

      // Execute tools
      console.log(`[checkAndGenerateTask] Executing ${toolUses.length} tool(s)`);
      for (const toolUse of toolUses) {
        try {
          const output = await executeTool(toolUse.name, toolUse.args);
          console.log(`[checkAndGenerateTask] Tool ${toolUse.name} executed:`, output);
        } catch (error: any) {
          console.error(`[checkAndGenerateTask] Error executing tool ${toolUse.name}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error('[checkAndGenerateTask] Error:', error.message);
      return null;
    }
  });
}
