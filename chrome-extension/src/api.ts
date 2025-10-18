import { Message, ChatResponse } from './types';

const API_BASE_URL = 'http://localhost:3000/api';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchWithErrorHandling<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async createConversation(userId?: string): Promise<number> {
    const response = await this.fetchWithErrorHandling<ChatResponse>(
      `${this.baseUrl}/chat/conversations`,
      {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }
    );

    if (!response.conversationId) {
      throw new Error('Failed to create conversation');
    }

    return response.conversationId;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    const response = await this.fetchWithErrorHandling<ChatResponse>(
      `${this.baseUrl}/chat/conversations/${conversationId}/messages`
    );

    return response.messages || [];
  }

  async sendMessage(
    conversationId: number,
    content: string
  ): Promise<{ userMessage: Message; aiMessage: Message }> {
    const response = await this.fetchWithErrorHandling<ChatResponse>(
      `${this.baseUrl}/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );

    if (!response.userMessage || !response.aiMessage) {
      throw new Error('Invalid response from server');
    }

    return {
      userMessage: response.userMessage,
      aiMessage: response.aiMessage,
    };
  }

  async getContext(conversationId: number): Promise<Record<string, string>> {
    const response = await this.fetchWithErrorHandling<{
      success: boolean;
      context: Record<string, string>;
    }>(`${this.baseUrl}/chat/conversations/${conversationId}/context`);

    return response.context;
  }

  async saveContext(
    conversationId: number,
    key: string,
    value: string
  ): Promise<void> {
    await this.fetchWithErrorHandling(
      `${this.baseUrl}/chat/conversations/${conversationId}/context`,
      {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      }
    );
  }

  // Polling mechanism for real-time updates
  startPolling(
    conversationId: number,
    onNewMessages: (messages: Message[]) => void,
    intervalMs: number = 2000
  ): () => void {
    let lastMessageCount = 0;
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;

      try {
        const messages = await this.getMessages(conversationId);
        if (messages.length > lastMessageCount) {
          lastMessageCount = messages.length;
          onNewMessages(messages);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      if (isPolling) {
        setTimeout(poll, intervalMs);
      }
    };

    poll();

    // Return stop function
    return () => {
      isPolling = false;
    };
  }
}

export default new ApiClient();

