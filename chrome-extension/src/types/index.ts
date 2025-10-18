export interface Message {
  id: number;
  conversation_id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface ChatResponse {
  success: boolean;
  userMessage?: Message;
  aiMessage?: Message;
  conversationId?: number;
  messages?: Message[];
  message?: string;
  error?: string;
}

export interface ConversationContext {
  [key: string]: string;
}

export interface ApiError {
  success: false;
  error: string;
}
