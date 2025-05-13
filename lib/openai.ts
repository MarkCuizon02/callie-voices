import OpenAI from 'openai';

// Helper function to make API calls to our server endpoints
async function callServerEndpoint(endpoint: string, data: any) {
  const response = await fetch(`/api/openai/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response;
}

export async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    
    const response = await fetch('/api/openai/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error('Error transcribing speech:', error);
    throw error;
  }
}

export async function generateSpeech(
  text: string,
  voice: string = 'alloy',
  speed: number = 1.0
): Promise<{ audioUrl: string }> {
  try {
    const response = await callServerEndpoint('speech', { text, voice, speed });
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    return { audioUrl };
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}

export async function chatWithAI(messages: { role: 'user' | 'assistant' | 'system', content: string }[]): Promise<string> {
  try {
    const response = await callServerEndpoint('chat', { messages });
    const data = await response.json();
    return data.message || '';
  } catch (error) {
    console.error('Error chatting with AI:', error);
    throw error;
  }
}