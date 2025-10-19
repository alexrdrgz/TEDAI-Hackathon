import { Router } from 'express';
import {
  createSession,
  saveMessage,
  getSessionHistory,
  getSessionWithContext,
  sessionExists,
  getAllSessions
} from '../../services/chat';
import { generateChatResponse } from '../../services/gemini_chat';

const router = Router();

// Store pending polling requests
interface PendingRequest {
  sessionId: string;
  lastMessageId: number;
  resolve: (value: any) => void;
  timeout: NodeJS.Timeout;
}

const pendingRequests: Map<string, PendingRequest[]> = new Map();

/**
 * POST /api/chat/session
 * Create a new chat session
 */
router.post('/session', async (req, res) => {
  try {
    const sessionId = await createSession();
    res.json({ 
      success: true, 
      session_id: sessionId 
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create session' 
    });
  }
});

/**
 * GET /api/chat/sessions
 * Get all chat sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await getAllSessions();
    res.json({ 
      success: true, 
      sessions 
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sessions' 
    });
  }
});

/**
 * GET /api/chat/session/:sessionId/messages
 * Get message history for a session
 */
router.get('/session/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const exists = await sessionExists(sessionId);
    if (!exists) {
      res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
      return;
    }

    const messages = await getSessionHistory(sessionId, limit);
    res.json({ 
      success: true, 
      messages 
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch messages' 
    });
  }
});

/**
 * POST /api/chat/session/:sessionId/message
 * Send a message and get AI response
 */
router.post('/session/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
      return;
    }

    const exists = await sessionExists(sessionId);
    if (!exists) {
      res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
      return;
    }

    // Save user message
    const userMessageId = await saveMessage(sessionId, 'user', message);

    // Notify any pending polling requests about the new user message
    notifyPendingRequests(sessionId, userMessageId);

    // Get conversation history
    const history = await getSessionHistory(sessionId);
    const conversationMessages = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Generate AI response
    const aiResponse = await generateChatResponse(conversationMessages, sessionId);

    // Save AI response
    const assistantMessageId = await saveMessage(sessionId, 'assistant', aiResponse);

    // Notify any pending polling requests about the AI response
    notifyPendingRequests(sessionId, assistantMessageId);

    res.json({ 
      success: true, 
      response: aiResponse,
      user_message_id: userMessageId,
      assistant_message_id: assistantMessageId
    });
  } catch (error: any) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process message' 
    });
  }
});

/**
 * GET /api/chat/session/:sessionId/poll
 * Long-polling endpoint for real-time updates
 */
router.get('/session/:sessionId/poll', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const lastMessageId = parseInt(req.query.lastMessageId as string) || 0;

    const exists = await sessionExists(sessionId);
    if (!exists) {
      res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
      return;
    }

    // Check if there are new messages immediately
    const messages = await getSessionHistory(sessionId);
    const newMessages = messages.filter(msg => msg.id > lastMessageId);

    if (newMessages.length > 0) {
      // Return new messages immediately
      res.json({ 
        success: true, 
        messages: newMessages 
      });
      return;
    }

    // No new messages, set up long-polling
    const timeout = setTimeout(() => {
      // Remove from pending requests
      removePendingRequest(sessionId, res);
      
      // Return empty result after timeout
      res.json({ 
        success: true, 
        messages: [] 
      });
    }, 30000); // 30 second timeout

    // Store the pending request
    if (!pendingRequests.has(sessionId)) {
      pendingRequests.set(sessionId, []);
    }

    pendingRequests.get(sessionId)!.push({
      sessionId,
      lastMessageId,
      resolve: (messages) => {
        clearTimeout(timeout);
        res.json({ 
          success: true, 
          messages 
        });
      },
      timeout
    });

    // Clean up on client disconnect
    req.on('close', () => {
      removePendingRequest(sessionId, res);
    });

  } catch (error: any) {
    console.error('Error in polling:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Polling failed' 
    });
  }
});

/**
 * Notify pending polling requests about new messages
 */
function notifyPendingRequests(sessionId: string, newMessageId: number) {
  const requests = pendingRequests.get(sessionId);
  if (!requests || requests.length === 0) return;

  // Get new messages for all pending requests
  getSessionHistory(sessionId).then(allMessages => {
    requests.forEach(request => {
      const newMessages = allMessages.filter(msg => msg.id > request.lastMessageId);
      if (newMessages.length > 0) {
        request.resolve(newMessages);
      }
    });
    
    // Clear all pending requests for this session
    pendingRequests.delete(sessionId);
  });
}

/**
 * Remove a specific pending request
 */
function removePendingRequest(sessionId: string, res: any) {
  const requests = pendingRequests.get(sessionId);
  if (!requests) return;

  const index = requests.findIndex(r => r.resolve === res);
  if (index !== -1) {
    clearTimeout(requests[index].timeout);
    requests.splice(index, 1);
  }

  if (requests.length === 0) {
    pendingRequests.delete(sessionId);
  }
}

export default router;
