import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY not set in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const getChatResponse = async (
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> => {
  try {
    // Use gemini-pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Format conversation history for Gemini
    // Gemini expects alternating user/model messages
    const history = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Start a chat session with history
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // Send the user's message
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to get AI response');
  }
};

export const getChatResponseWithContext = async (
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  contextData: Record<string, string> = {}
): Promise<string> => {
  try {
    // Build a system context message if context data exists
    let enhancedHistory = [...conversationHistory];
    
    if (Object.keys(contextData).length > 0) {
      const contextString = Object.entries(contextData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      // Add context as a system-like message at the beginning
      enhancedHistory = [
        {
          role: 'user',
          content: `Context information: ${contextString}`
        },
        {
          role: 'assistant',
          content: 'I understand the context. How can I help you?'
        },
        ...conversationHistory
      ];
    }

    return await getChatResponse(userMessage, enhancedHistory);
  } catch (error) {
    console.error('Error in getChatResponseWithContext:', error);
    throw error;
  }
};
