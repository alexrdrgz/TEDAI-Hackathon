import { config } from 'dotenv';

config();

export const SMART_MODEL = process.env.SMART_MODEL || 'google/gemini-2.5-pro';
export const IMAGE_MODEL = process.env.IMAGE_MODEL || 'google/gemini-2.5-flash';
export const CHEAP_MODEL = process.env.CHEAP_MODEL || 'google/gemini-2.5-flash';

export function isOllamaModel(model: string): boolean {
  return model.startsWith('ollama/');
}

export function extractModelName(model: string): string {
  if (isOllamaModel(model)) {
    return model.replace('ollama/', '');
  }
  return model.replace('google/', '');
}
