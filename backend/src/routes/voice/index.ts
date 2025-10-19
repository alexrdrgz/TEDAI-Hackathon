import { Router } from 'express';
import multer from 'multer';
import { transcribeAudio, textToSpeech, isVoiceServiceAvailable, getAvailableVoices } from '../../services/voice';
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
      ? 'Local voice services are available (Faster Whisper + pyttsx3)'
      : 'Voice services not configured. Run setup.sh in backend/speech_service directory.',
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
 * Transcribe audio to text
 */
router.post('/transcribe', upload.single('audio') as any, async (req, res) => {
  try {
    if (!isVoiceServiceAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Voice services not available. Please configure Google Cloud credentials.',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
      return;
    }

    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    const transcription = await transcribeAudio(audioBuffer, mimeType);

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
        error: 'Voice services not available. Please configure Google Cloud credentials.',
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

    // Set headers for audio response (pyttsx3 outputs WAV format)
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
 * Combined endpoint: transcribe audio, generate AI response, convert to speech
 */
router.post('/session/:sessionId/message', upload.single('audio') as any, async (req, res) => {
  try {
    if (!isVoiceServiceAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Voice services not available. Please configure Google Cloud credentials.',
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

    // 1. Transcribe audio
    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const transcription = await transcribeAudio(audioBuffer, mimeType);

    // 2. Save user message
    const userMessageId = await saveMessage(sessionId, 'user', transcription);

    // 3. Get conversation history
    const history = await getSessionHistory(sessionId);
    const conversationMessages = history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 4. Generate AI response
    const aiResponse = await generateChatResponse(conversationMessages, sessionId);

    // 5. Save AI response
    const assistantMessageId = await saveMessage(sessionId, 'assistant', aiResponse);

    // 6. Convert AI response to speech
    const audioResponse = await textToSpeech(aiResponse);

    // 7. Return both text and audio
    res.json({
      success: true,
      transcription,
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

