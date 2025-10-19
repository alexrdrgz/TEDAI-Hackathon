import { Router } from 'express';
import multer from 'multer';
import { textToSpeech, isVoiceServiceAvailable, getAvailableVoices, transcribeAudio } from '../../services/voice';
import { saveMessage, sessionExists, getSessionHistory } from '../../services/chat';
import { generateChatResponse } from '../../services/gemini';

const router = Router();

// Configure multer for handling audio uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

/**
 * GET /api/voice/status
 * Check if voice services are available
 */
router.get('/status', (req, res) => {
  const available = isVoiceServiceAvailable();
  res.json({
    success: true,
    available,
    message: available
      ? 'Voice services are available (Google Cloud TTS)'
      : 'Voice services not configured. Set GOOGLE_APPLICATION_CREDENTIALS environment variable.',
  });
});

/**
 * GET /api/voice/voices
 * Get available TTS voices
 */
router.get('/voices', async (req, res) => {
  try {
    if (!isVoiceServiceAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Voice services not available.',
      });
      return;
    }

    const voices = await getAvailableVoices();
    res.json(voices);
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch voices',
    });
  }
});

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text using Gemini
 */
router.post('/transcribe', upload.single('audio') as any, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
      return;
    }

    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // Use Gemini to transcribe audio
    const transcription = await generateChatResponse([
      {
        role: 'user',
        content: 'Please transcribe this audio exactly as spoken.',
        audioBuffer,
        audioMimeType: mimeType,
      } as any
    ]);

    res.json({
      success: true,
      text: transcription,
    });
  } catch (error: any) {
    console.error('Error in transcribe endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to transcribe audio',
    });
  }
});

/**
 * POST /api/voice/speak
 * Convert text to speech
 */
router.post('/speak', async (req, res) => {
  try {
    if (!isVoiceServiceAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Voice services not available.',
      });
      return;
    }

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Text is required',
      });
      return;
    }

    if (text.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Text cannot be empty',
      });
      return;
    }

    const audioBuffer = await textToSpeech(text);

    // Set headers for audio response (Gemini TTS outputs audio)
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  } catch (error: any) {
    console.error('Error in speak endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate speech',
    });
  }
});

/**
 * POST /api/voice/session/:sessionId/message
 * Combined endpoint: send audio to AI, generate response, convert to speech
 */
router.post('/session/:sessionId/message', upload.single('audio') as any, async (req, res) => {
  try {
    if (!isVoiceServiceAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Voice services not available.',
      });
      return;
    }

    const { sessionId } = req.params;

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
      return;
    }

    // Check if session exists
    const exists = await sessionExists(sessionId);
    if (!exists) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    // 1. Get audio buffer
    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // 2. Get conversation history
    const history = await getSessionHistory(sessionId);
    const conversationMessages = history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 3. Add current audio message
    conversationMessages.push({
      role: 'user',
      content: '',
      audioBuffer,
      audioMimeType: mimeType,
    } as any);

    // 4. Run transcription and AI response in parallel (both happen at same time!)
    const [aiResponse, transcriptionText] = await Promise.all([
      generateChatResponse(conversationMessages, sessionId, true),
      transcribeAudio(audioBuffer, mimeType).catch((err: any) => {
        console.warn('Failed to transcribe audio in background:', err.message);
        return '[Audio message]';
      })
    ]);

    // 5. Save user message once with transcription (or fallback)
    const userMessageId = await saveMessage(sessionId, 'user', transcriptionText);

    // 6. Save AI response
    const assistantMessageId = await saveMessage(sessionId, 'assistant', aiResponse);

    // 7. Convert AI response to speech
    const audioResponse = await textToSpeech(aiResponse);

    // 8. Return both text and audio
    res.json({
      success: true,
      response: aiResponse,
      user_message_id: userMessageId,
      assistant_message_id: assistantMessageId,
      audio: audioResponse.toString('base64'), // Send as base64
    });
  } catch (error: any) {
    console.error('Error in voice message endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process voice message',
    });
  }
});

export default router;
