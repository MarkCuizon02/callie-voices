import OpenAI from 'openai';

// Valid voices for OpenAI TTS
const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type Voice = typeof VALID_VOICES[number];

// Interface for chat messages
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Interface for API response
interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Constants for API configuration
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Helper function to make API calls to server endpoints with retry logic and timeout
 * @param endpoint - The API endpoint (e.g., 'transcribe', 'speech', 'chat')
 * @param data - The payload to send (JSON or FormData)
 * @param retries - Number of retries remaining
 * @returns Promise with the response
 */
async function callServerEndpoint(endpoint: string, data: any, retries = MAX_RETRIES): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`/api/openai/${endpoint}`, {
      method: 'POST',
      headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      body: data instanceof FormData ? data : JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        // Retry on rate limit with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)));
        return callServerEndpoint(endpoint, data, retries - 1);
      }
      throw new Error(getErrorMessage(response.status));
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out after ${API_TIMEOUT / 1000} seconds`);
    }
    if (retries > 0 && error instanceof Error && error.message.includes('network')) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)));
      return callServerEndpoint(endpoint, data, retries - 1);
    }
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Maps HTTP status codes to user-friendly error messages
 * @param status - HTTP status code
 * @returns Error message string
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication failed. Please check your API key.';
    case 429:
      return 'Rate limit exceeded. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return `API call failed with status ${status}.`;
  }
}

/**
 * Transcribes audio using OpenAI's Whisper API
 * @param audioBlob - The audio file to transcribe
 * @returns The transcribed text
 */
export async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  try {
    if (!audioBlob.size) {
      throw new Error('Empty audio file provided');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');

    const response = await callServerEndpoint('transcribe', formData);
    const result: ApiResponse<{ text: string }> = await response.json();

    if (result.error || !result.data?.text) {
      throw new Error(result.error || 'No transcription returned');
    }

    return result.data.text;
  } catch (error) {
    console.error('Error transcribing speech:', error);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates speech from text using OpenAI's TTS API
 * @param text - The text to convert to speech
 * @param voice - The voice to use (default: 'alloy')
 * @param speed - The speed of the speech (default: 1.0)
 * @returns Object containing the audio URL
 */
export async function generateSpeech(
  text: string,
  voice: string = 'alloy',
  speed: number = 1.0
): Promise<{ audioUrl: string }> {
  try {
    if (!text.trim()) {
      throw new Error('Empty text provided for speech generation');
    }
    if (!VALID_VOICES.includes(voice as Voice)) {
      throw new Error(`Invalid voice: ${voice}. Must be one of ${VALID_VOICES.join(', ')}`);
    }
    if (speed < 0.5 || speed > 2.0) {
      throw new Error('Speed must be between 0.5 and 2.0');
    }

    const response = await callServerEndpoint('speech', { text, voice, speed });
    const audioBlob = await response.blob();
    if (!audioBlob.size) {
      throw new Error('Empty audio response received');
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    return { audioUrl };
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Chats with OpenAI's Chat API
 * @param messages - Array of chat messages
 * @returns The AI's response message
 */
export async function chatWithAI(messages: ChatMessage[]): Promise<string> {
  try {
    if (!messages.length || !messages.some((msg) => msg.role === 'user')) {
      throw new Error('No user messages provided');
    }

    const response = await callServerEndpoint('chat', { messages });
    const result: ApiResponse<{ message: string }> = await response.json();

    if (result.error || !result.data?.message) {
      throw new Error(result.error || 'No response message returned');
    }

    return result.data.message;
  } catch (error) {
    console.error('Error chatting with AI:', error);
    throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}