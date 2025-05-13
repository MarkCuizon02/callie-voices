import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client only on the server side
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Get the JSON body
    const { text, voice, speed } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    // Call OpenAI's API to generate speech
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice || 'alloy',
      input: text,
      speed: speed || 1.0,
    });
    
    // Get the audio data as an ArrayBuffer
    const buffer = await speechResponse.arrayBuffer();
    
    // Return the audio data with the appropriate content type
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}