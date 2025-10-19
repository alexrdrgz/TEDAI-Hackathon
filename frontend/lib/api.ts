const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

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
  title?: string;
}

export interface Snapshot {
  screenshot_path: string;
  caption: string;
  full_description: string;
  changes: string[];
  facts: string[];
  created_at: string;
}

/**
 * Get all chat sessions with titles
 */
export async function getSessions(): Promise<Session[]> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions`);
  const data = await response.json();
  if (data.success) {
    return data.sessions;
  }
  throw new Error('Failed to fetch sessions');
}

/**
 * Create a new chat session
 */
export async function createSession(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/chat/session`, {
    method: 'POST',
  });
  const data = await response.json();
  if (data.success) {
    return data.session_id;
  }
  throw new Error('Failed to create session');
}

/**
 * Get message history for a session
 */
export async function getMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
  const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}/messages?limit=${limit}`);
  const data = await response.json();
  if (data.success) {
    return data.messages;
  }
  throw new Error(data.error || 'Failed to fetch messages');
}

/**
 * Send a message and get AI response
 */
export async function sendMessage(sessionId: string, message: string): Promise<{
  response: string;
  user_message_id: number;
  assistant_message_id: number;
}> {
  const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = await response.json();
  if (data.success) {
    return {
      response: data.response,
      user_message_id: data.user_message_id,
      assistant_message_id: data.assistant_message_id,
    };
  }
  throw new Error('Failed to send message');
}

/**
 * Poll for new messages
 */
export async function pollMessages(
  sessionId: string,
  lastMessageId: number,
  signal?: AbortSignal
): Promise<Message[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}/poll?lastMessageId=${lastMessageId}`, {
      signal,
    });
    
    // Handle 404 - session doesn't exist
    if (response.status === 404) {
      return [];
    }
    
    const data = await response.json();
    if (data.success) {
      return data.messages;
    }
    return [];
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return [];
    }
    // Suppress logging for polling (normal timeouts expected)
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
          lastMessageId = Math.max(...messages.map(m => m.id));
        }

        if (isPolling) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        if (!isPolling) break;

        console.error('Polling error:', error);
        if (onError) {
          onError(error);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  poll();

  return () => {
    isPolling = false;
    if (abortController) {
      abortController.abort();
    }
  };
}

/**
 * Send voice message and get AI response
 */
export async function sendVoiceMessage(
  sessionId: string,
  audioBlob: Blob
): Promise<{
  transcription: string;
  response: string;
  user_message_id: number;
  assistant_message_id: number;
  audio: string;
}> {
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const response = await fetch(`${API_BASE_URL}/voice/session/${sessionId}/message`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (data.success) {
    return {
      transcription: data.transcription,
      response: data.response,
      user_message_id: data.user_message_id,
      assistant_message_id: data.assistant_message_id,
      audio: data.audio,
    };
  }
  throw new Error(data.error || 'Failed to send voice message');
}

/**
 * Get timeline snapshots for a session
 */
export async function getTimelineSnapshots(sessionId: string): Promise<Snapshot[]> {
  const response = await fetch(`${API_BASE_URL}/monitor/timeline/${sessionId}`);
  const data = await response.json();
  if (data.success) {
    return data.snapshots;
  }
  throw new Error('Failed to fetch timeline snapshots');
}

/**
 * Get all timeline snapshots
 */
export async function getAllSnapshots(): Promise<Snapshot[]> {
  const response = await fetch(`${API_BASE_URL}/monitor/timeline`);
  const data = await response.json();
  if (data.success) {
    return data.snapshots;
  }
  throw new Error('Failed to fetch all snapshots');
}

export interface TimeCategory {
  category: string;
  description: string;
  percentage: number;
  duration: string;
}

export interface TimeSummary {
  categories: TimeCategory[];
  totalActivities: number;
  summary: string;
}

/**
 * Get AI-powered time summary for a session
 */
export async function getTimeSummary(sessionId: string): Promise<TimeSummary> {
  console.log('[API] Fetching time summary for session:', sessionId)
  console.log('[API] URL:', `${API_BASE_URL}/monitor/time-summary/${sessionId}`)
  const response = await fetch(`${API_BASE_URL}/monitor/time-summary/${sessionId}`);
  console.log('[API] Response status:', response.status)
  const data = await response.json();
  console.log('[API] Response data:', data)
  if (data.success) {
    return data.summary;
  }
  throw new Error('Failed to fetch time summary');
}

export interface Task {
  id: string;
  type: 'email' | 'calendar' | 'reminder';
  data: any;
  status: string;
  createdAt: string;
}

/**
 * Get a specific task by ID
 */
export async function getTask(taskId: string): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
  const data = await response.json();
  if (data.success) {
    return data.task;
  }
  throw new Error(data.error || 'Failed to fetch task');
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, type: string, taskData: any): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data: taskData }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update task');
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete task');
  }
}
