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
      timeout: 35000, // Slightly longer than server timeout
      validateStatus: (status) => status < 500 // Don't throw on 4xx status
    });
    
    // Check if response is not success or is 404 (session doesn't exist)
    if (response.status === 404) {
      // Silently return empty - session doesn't exist yet or was deleted
      return [];
    }
    
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
    // Suppress logging for polling (it's expected to timeout occasionally)
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

/**
 * Check voice service status
 */
export async function getVoiceStatus(): Promise<{ available: boolean; message: string }> {
  const response = await axios.get(`${API_BASE_URL}/voice/status`);
  if (response.data.success) {
    return {
      available: response.data.available,
      message: response.data.message,
    };
  }
  throw new Error('Failed to check voice status');
}

/**
 * Transcribe audio to text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const response = await axios.post(`${API_BASE_URL}/voice/transcribe`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (response.data.success) {
    return response.data.text;
  }
  throw new Error(response.data.error || 'Failed to transcribe audio');
}

/**
 * Convert text to speech
 */
export async function textToSpeech(text: string): Promise<Blob> {
  const response = await axios.post(
    `${API_BASE_URL}/voice/speak`,
    { text },
    {
      responseType: 'blob',
    }
  );

  return response.data;
}

/**
 * Send voice message and get AI response (combined endpoint)
 */
export async function sendVoiceMessage(
  sessionId: string,
  audioBlob: Blob
): Promise<{
  transcription: string;
  response: string;
  user_message_id: number;
  assistant_message_id: number;
  audio: string; // base64 encoded audio
}> {
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const response = await axios.post(
    `${API_BASE_URL}/voice/session/${sessionId}/message`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  if (response.data.success) {
    return {
      transcription: response.data.transcription,
      response: response.data.response,
      user_message_id: response.data.user_message_id,
      assistant_message_id: response.data.assistant_message_id,
      audio: response.data.audio,
    };
  }
  throw new Error(response.data.error || 'Failed to send voice message');
}

/**
 * Get timeline snapshots for a session
 */
export interface Snapshot {
  screenshot_path: string;
  caption: string;
  full_description: string;
  changes: string[];
  facts: string[];
  created_at: string;
}

export async function getTimelineSnapshots(sessionId: string): Promise<Snapshot[]> {
  const response = await axios.get(`${API_BASE_URL}/monitor/timeline/${sessionId}`);
  if (response.data.success) {
    return response.data.snapshots;
  }
  throw new Error('Failed to fetch timeline snapshots');
}

export async function getAllSnapshots(): Promise<Snapshot[]> {
  const response = await axios.get(`${API_BASE_URL}/monitor/timeline`);
  if (response.data.success) {
    return response.data.snapshots;
  }
  throw new Error('Failed to fetch all snapshots');
}

