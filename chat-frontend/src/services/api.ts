import axios from 'axios';

// Use relative URL to leverage Vite's proxy and avoid corporate firewall blocking localhost
const API_BASE_URL = '/api';

export interface Message {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Session {
  id: number;
  session_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new chat session
 */
export async function createSession(): Promise<string> {
  const response = await axios.post(`${API_BASE_URL}/chat/session`);
  if (response.data.success) {
    return response.data.session_id;
  }
  throw new Error('Failed to create session');
}

/**
 * Get all chat sessions
 */
export async function getSessions(): Promise<Session[]> {
  const response = await axios.get(`${API_BASE_URL}/chat/sessions`);
  if (response.data.success) {
    return response.data.sessions;
  }
  throw new Error('Failed to fetch sessions');
}

/**
 * Get message history for a session
 */
export async function getMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
  const response = await axios.get(`${API_BASE_URL}/chat/session/${sessionId}/messages`, {
    params: { limit }
  });
  if (response.data.success) {
    return response.data.messages;
  }
  throw new Error('Failed to fetch messages');
}

/**
 * Send a message and get AI response
 */
export async function sendMessage(sessionId: string, message: string): Promise<{
  response: string;
  user_message_id: number;
  assistant_message_id: number;
}> {
  const response = await axios.post(`${API_BASE_URL}/chat/session/${sessionId}/message`, {
    message
  });
  if (response.data.success) {
    return {
      response: response.data.response,
      user_message_id: response.data.user_message_id,
      assistant_message_id: response.data.assistant_message_id
    };
  }
  throw new Error('Failed to send message');
}

/**
 * Long-polling for new messages
 */
export async function pollMessages(
  sessionId: string,
  lastMessageId: number,
  signal?: AbortSignal
): Promise<Message[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/session/${sessionId}/poll`, {
      params: { lastMessageId },
      signal,
      timeout: 35000 // Slightly longer than server timeout
    });
    if (response.data.success) {
      return response.data.messages;
    }
    return [];
  } catch (error: any) {
    if (axios.isCancel(error) || error.name === 'CanceledError') {
      // Request was cancelled, return empty array
      return [];
    }
    // On timeout or error, return empty array and let caller retry
    console.warn('Polling error:', error.message);
    return [];
  }
}

/**
 * Start long-polling loop
 */
export function startPolling(
  sessionId: string,
  lastMessageId: number,
  onNewMessages: (messages: Message[]) => void,
  onError?: (error: Error) => void
): () => void {
  let isPolling = true;
  let abortController: AbortController | null = null;

  const poll = async () => {
    while (isPolling) {
      try {
        abortController = new AbortController();
        const messages = await pollMessages(sessionId, lastMessageId, abortController.signal);
        
        if (messages.length > 0 && isPolling) {
          onNewMessages(messages);
          // Update lastMessageId to the highest message ID received
          lastMessageId = Math.max(...messages.map(m => m.id));
        }

        // Small delay before next poll to avoid hammering the server
        if (isPolling) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        if (!isPolling) break;
        
        console.error('Polling error:', error);
        if (onError) {
          onError(error);
        }
        
        // Wait a bit before retrying on error
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  // Start polling
  poll();

  // Return stop function
  return () => {
    isPolling = false;
    if (abortController) {
      abortController.abort();
    }
  };
}

