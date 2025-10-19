import { spawn } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import axios from 'axios';

dotenv.config();

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Python virtual environment path
const SPEECH_SERVICE_DIR = path.join(__dirname, '../../speech_service');
const PYTHON_PATH = path.join(SPEECH_SERVICE_DIR, 'venv/bin/python3');
const TEMP_DIR = path.join(__dirname, '../../temp');

// Check if Python speech service is available
let serviceAvailable = false;

async function checkServiceAvailability() {
  try {
    // Check if venv exists
    if (!fs.existsSync(PYTHON_PATH)) {
      console.warn('⚠️  Python virtual environment not found. Run setup.sh in speech_service directory.');
      return false;
    }

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    serviceAvailable = true;
    console.log('✅ Local speech service is available');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to initialize speech service:', error.message);
    serviceAvailable = false;
    return false;
  }
}

// Initialize on module load
checkServiceAvailability();

/**
 * Execute Python script and get JSON result
 */
function executePythonScript(scriptName: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SPEECH_SERVICE_DIR, scriptName);
    
    // Ensure ffmpeg is in PATH for TTS conversion
    const env = { ...process.env };
    if (!env.PATH?.includes('/opt/homebrew/bin')) {
      env.PATH = `/opt/homebrew/bin:${env.PATH || ''}`;
    }
    
    const pythonProcess = spawn(PYTHON_PATH, [scriptPath, ...args], { env });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });
    
    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

/**
 * Transcribe audio to text using Faster Whisper (local)
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
  if (!serviceAvailable) {
    throw new Error('Speech service not available. Please run setup.sh in speech_service directory.');
  }

  try {
    // Save audio to temporary file
    const tempFileName = `audio_${Date.now()}.${getExtensionFromMimeType(mimeType)}`;
    const tempFilePath = path.join(TEMP_DIR, tempFileName);
    
    await writeFile(tempFilePath, audioBuffer);
    
    try {
      // Call Python STT script
      const result = await executePythonScript('stt.py', [tempFilePath]);
      
      if (!result.success) {
        throw new Error(result.error || 'STT failed');
      }
      
      return result.text;
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFilePath);
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }
    }
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm'; // default
}

/**
 * Convert text to speech using Google Cloud TTS with Gemini voices
 */
export async function textToSpeech(text: string): Promise<Buffer> {
  try {
    const textToSpeech = require('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();

    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-J'
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 24000
      }
    };

    const [response] = await client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content in response');
    }
    
    return Buffer.from(response.audioContent);
  } catch (error: any) {
    console.error('Error generating speech with Google Cloud TTS:', error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

/**
 * Check if voice services are available
 */
export function isVoiceServiceAvailable(): boolean {
  return true; // Google Cloud TTS is always available via Node.js SDK
}

/**
 * Get available TTS voices
 */
export async function getAvailableVoices(): Promise<any> {
  if (!serviceAvailable) {
    throw new Error('Speech service not available.');
  }

  try {
    const result = await executePythonScript('list_voices.py', []);
    return result;
  } catch (error: any) {
    console.error('Error listing voices:', error);
    throw new Error(`Failed to list voices: ${error.message}`);
  }
}

