import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isOllamaModel, extractModelName } from '../services/config';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export async function generateContent(modelName: string, content: ContentPart[]): Promise<string> {
  if (isOllamaModel(modelName)) {
    return generateOllamaContent(modelName, content);
  } else {
    return generateGeminiContent(modelName, content);
  }
}

async function generateGeminiContent(modelName: string, content: ContentPart[]): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: extractModelName(modelName),
  });
  
  // Convert ContentPart to Google's Part type
  const parts: any[] = content.map(part => {
    if (part.text) {
      return { text: part.text };
    } else if (part.inlineData) {
      return {
        inlineData: part.inlineData
      };
    }
    throw new Error('Invalid content part');
  });

  const response = await model.generateContent(parts);
  return response.response.text();
}

async function generateOllamaContent(modelName: string, content: ContentPart[]): Promise<string> {
  const cleanModelName = extractModelName(modelName);
  
  // Extract text and image data from content parts
  let prompt = '';
  let imageData: string | undefined;

  for (const part of content) {
    if (part.text) {
      prompt += part.text;
    } else if (part.inlineData?.mimeType === 'image/png') {
      imageData = part.inlineData.data;
    }
  }

  const payload: any = {
    model: cleanModelName,
    prompt: prompt,
    stream: false,
  };

  // Add image data if present (for vision models like llava)
  if (imageData) {
    payload.images = [imageData];
  }

  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, payload, {
      timeout: 300000, // 5 minute timeout for long-running tasks
    });

    return response.data.response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Ollama API error: ${error.message}. Make sure Ollama is running at ${OLLAMA_BASE_URL}`
      );
    }
    throw error;
  }
}
