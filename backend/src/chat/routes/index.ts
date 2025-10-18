import { Router, Request, Response } from 'express';
import {
  createConversation,
  getConversation,
  createMessage,
  getConversationHistory,
  saveContext,
  getContext
} from '../models/database';
import { getChatResponseWithContext } from '../services/gemini';

const router = Router();

// Create a new conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || 'default_user';
    const conversationId = createConversation(userId);
    
    res.status(201).json({
      success: true,
      conversationId,
      message: 'Conversation created successfully'
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
});

// Get all messages for a conversation
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    
    if (isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    // Check if conversation exists
    const conversation = getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const messages = getConversationHistory(conversationId);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Send a message and get AI response
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { content } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    // Check if conversation exists
    const conversation = getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Save user message
    const userMessageId = createMessage(conversationId, 'user', content);

    // Get conversation history for context
    const history = getConversationHistory(conversationId);
    // Remove the just-added message from history for AI context
    const contextHistory = history.slice(0, -1).map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Get any stored context
    const contextData = getContext(conversationId);

    // Get AI response
    const aiResponse = await getChatResponseWithContext(
      content,
      contextHistory,
      contextData
    );

    // Save AI response
    const aiMessageId = createMessage(conversationId, 'assistant', aiResponse);

    res.json({
      success: true,
      userMessage: {
        id: userMessageId,
        role: 'user',
        content,
        conversationId
      },
      aiMessage: {
        id: aiMessageId,
        role: 'assistant',
        content: aiResponse,
        conversationId
      }
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

// Get conversation context/memory
router.get('/conversations/:id/context', async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);

    if (isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    const context = getContext(conversationId);

    res.json({
      success: true,
      context
    });
  } catch (error) {
    console.error('Error fetching context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch context'
    });
  }
});

// Save context/memory for a conversation
router.post('/conversations/:id/context', async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { key, value } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        error: 'Both key and value are required'
      });
    }

    saveContext(conversationId, key, value);

    res.json({
      success: true,
      message: 'Context saved successfully'
    });
  } catch (error) {
    console.error('Error saving context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save context'
    });
  }
});

export default router;

