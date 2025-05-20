import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client only on the server side
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// Valid voices for OpenAI TTS
const VALID_VOICES = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'] as const;
type Voice = typeof VALID_VOICES[number];

export async function POST(request: Request) {
  try {
    // Get the JSON body
    const { text, voice, speed } = await request.json();
    
    // Validate required parameters
    if (!text?.trim()) {
      return NextResponse.json(
        { error: 'Text is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate voice parameter
    if (!VALID_VOICES.includes(voice as Voice)) {
      return NextResponse.json(
        { error: `Invalid voice. Must be one of: ${VALID_VOICES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate speed parameter
    const speechSpeed = Number(speed) || 1.0;
    if (speechSpeed < 0.5 || speechSpeed > 2.0) {
      return NextResponse.json(
        { error: 'Speed must be between 0.5 and 2.0' },
        { status: 400 }
      );
    }
      // Call OpenAI's API to generate speech with optimized settings
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1-hd', // Using HD model for better quality
      voice: voice as Voice,
      input: text,
      speed: speechSpeed,
      response_format: 'mp3', // Using MP3 for better compression
      quality: 'high' // Request higher quality audio
    } as any);
    
    // Get the audio data as an ArrayBuffer
    const buffer = await speechResponse.arrayBuffer();
    
    // Verify the buffer is not empty
    if (!buffer.byteLength) {
      throw new Error('Received empty audio buffer from OpenAI');
    }
    
    // Return the audio data with the appropriate content type
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate speech';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}