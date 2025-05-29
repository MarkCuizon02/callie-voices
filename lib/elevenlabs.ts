export interface ElevenLabsVoice {
  id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  provider: 'elevenlabs';
  gender?: 'male' | 'female' | 'neutral';
  languages?: string[];
  specialties?: string[];
  rating?: number;
  accent?: string;
}

export const getElevenLabsVoices = async (): Promise<ElevenLabsVoice[]> => {
  try {
    const response = await fetch('/api/elevenlabs/voices');

    if (!response.ok) {
      throw new Error('Failed to fetch ElevenLabs voices');
    }

    const data = await response.json();
    return data.voices.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category || 'General',
      description: voice.labels?.description || voice.name,
      preview_url: voice.preview_url,
      provider: 'elevenlabs' as const,
      gender: voice.labels?.gender || 'neutral',
      languages: voice.labels?.languages || ['English'],
      specialties: voice.labels?.specialties || ['General'],
      rating: voice.labels?.rating,
      accent: voice.labels?.accent
    }));
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    throw new Error('Failed to fetch ElevenLabs voices');
  }
};

export const generateElevenLabsSpeech = async (
  text: string,
  id: string,
  stability: number = 0.5,
  similarity: number = 0.75,
  style: number = 0.0,
  speakerBoost: boolean = true
): Promise<{ audioUrl: string; duration: number }> => {
  try {
    const response = await fetch('/api/elevenlabs/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId: id,
        stability: stability * 100,
        similarity: similarity * 100,
        style: style * 100,
        speakerBoost,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Create a temporary audio element to get duration
    const audio = new Audio(audioUrl);
    const duration = await new Promise<number>((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
    });

    return { audioUrl, duration };
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error('Failed to generate speech');
  }
}; 