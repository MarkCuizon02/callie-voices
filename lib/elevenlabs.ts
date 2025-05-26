interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
}

export async function getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  try {
    const response = await fetch('/api/elevenlabs/voices');
    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }
    const data = await response.json();
    return data.voices;
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
}

export async function generateElevenLabsSpeech(
  text: string,
  voiceId: string,
  stability: number,
  similarity: number,
  style: number
): Promise<{ audioUrl: string }> {
  try {
    const response = await fetch('/api/elevenlabs/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId,
        stability,
        similarity,
        style,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    return { audioUrl };
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
} 