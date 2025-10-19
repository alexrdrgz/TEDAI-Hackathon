import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmailScenario } from '../../data/mockScenarios';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateEmailFromContext(scenario: EmailScenario): Promise<{
  type: 'email';
  data: {
    to: string;
    subject: string;
    body: string;
  };
}> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_actual_api_key_here') {
    throw new Error('GEMINI_API_KEY is required. Please set your API key in the .env file.');
  }

  const prompt = `Generate a professional email based on the following context:

Context: ${scenario.context}
Recipient: ${scenario.to}
Tone: ${scenario.tone}
Key Points to Include: ${scenario.keyPoints?.join(', ') || 'None specified'}

Please generate a complete email with:
1. A clear, professional subject line
2. A well-structured email body that follows the context and tone

Return your response as a JSON object with this exact format:
{
  "subject": "Your generated subject line",
  "body": "Your generated email body with proper formatting"
}

Make sure the email is professional, contextual, and addresses all the key points mentioned.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    
    const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const emailData = JSON.parse(cleanedText);

    return {
      type: 'email',
      data: {
        to: scenario.to,
        subject: emailData.subject,
        body: emailData.body
      }
    };
  } catch (error) {
    console.error('Error generating email:', error);
    throw new Error(`Failed to generate email from context: ${error instanceof Error ? error.message : String(error)}`);
  }
}
