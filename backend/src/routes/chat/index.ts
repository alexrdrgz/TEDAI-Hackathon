import { Router } from 'express';
import {
  createSession,
  saveMessage,
  getSessionHistory,
  getSessionWithContext,
  sessionExists,
  getAllSessions
} from '../../services/chat';
import { generateChatResponse } from '../../services/gemini';

const router = Router();

// Store pending polling requests
interface PendingRequest {
  id: string;
  sessionId: string;
  lastMessageId: number;
  res: any; // Express Response object
  resolve: (value: any) => void;
  timeout: NodeJS.Timeout;
}

const pendingRequests: Map<string, PendingRequest[]> = new Map();

// Generate unique ID for each pending request
let requestIdCounter = 0;
function generateRequestId(): string {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

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
    console.error('[CreateSession] Error:', error.message);
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
    console.error('[GetSessions] Error:', error.message);
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
    console.error('[GetMessages] Error:', error.message);
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

    // Input validation
    if (!message || typeof message !== 'string') {
      res.status(400).json({ 
        success: false, 
        error: 'Message is required and must be a string' 
      });
      return;
    }

    // Trim and validate message content
    const trimmedMessage = message.trim();
    
    if (trimmedMessage.length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Message cannot be empty or contain only whitespace' 
      });
      return;
    }

    // Enforce maximum message length (4000 characters)
    const MAX_MESSAGE_LENGTH = 4000;
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ 
        success: false, 
        error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters (received ${trimmedMessage.length})` 
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

    // Save user message (using trimmed message)
    const userMessageId = await saveMessage(sessionId, 'user', trimmedMessage);

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
    console.error('[ChatMessage] Error:', error.message);
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
    let responseHandled = false;
    const requestId = generateRequestId();
    
    const timeout = setTimeout(() => {
      if (responseHandled) return;
      responseHandled = true;
      
      // Remove from pending requests
      removePendingRequest(sessionId, requestId);
      
      // Return empty result after timeout if not already sent
      if (!res.headersSent) {
        res.json({ 
          success: true, 
          messages: [] 
        });
      }
    }, 30000); // 30 second timeout

    // Store the pending request
    if (!pendingRequests.has(sessionId)) {
      pendingRequests.set(sessionId, []);
    }

    pendingRequests.get(sessionId)!.push({
      id: requestId,
      sessionId,
      lastMessageId,
      res,
      resolve: (messages) => {
        if (responseHandled) return;
        responseHandled = true;
        
        clearTimeout(timeout);
        if (!res.headersSent) {
          res.json({ 
            success: true, 
            messages 
          });
        }
      },
      timeout
    });

    // Clean up on client disconnect
    req.on('close', () => {
      if (!responseHandled) {
        responseHandled = true;
        removePendingRequest(sessionId, requestId);
      }
    });

  } catch (error: any) {
    console.error('[Polling] Error:', error.message);
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
    const unresolvedRequests: PendingRequest[] = [];
    
    requests.forEach(request => {
      // Skip if connection is already closed
      if (request.res.headersSent || request.res.writableEnded) {
        clearTimeout(request.timeout);
        return;
      }

      const newMessages = allMessages.filter(msg => msg.id > request.lastMessageId);
      if (newMessages.length > 0) {
        // Resolve this request with new messages
        request.resolve(newMessages);
      } else {
        // No new messages for this request yet, keep it waiting
        unresolvedRequests.push(request);
      }
    });
    
    // Update the map with only unresolved requests
    if (unresolvedRequests.length > 0) {
      pendingRequests.set(sessionId, unresolvedRequests);
    } else {
      pendingRequests.delete(sessionId);
    }
  }).catch(err => {
    console.error('Error in notifyPendingRequests:', err);
    // Clean up all requests for this session on error
    requests.forEach(r => clearTimeout(r.timeout));
    pendingRequests.delete(sessionId);
  });
}

/**
 * Remove a specific pending request by ID
 */
function removePendingRequest(sessionId: string, requestId: string) {
  const requests = pendingRequests.get(sessionId);
  if (!requests) return;

  const index = requests.findIndex(r => r.id === requestId);
  if (index !== -1) {
    clearTimeout(requests[index].timeout);
    requests.splice(index, 1);
  }

  if (requests.length === 0) {
    pendingRequests.delete(sessionId);
  }
}

export default router;
