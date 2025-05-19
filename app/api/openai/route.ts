import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Note: no NEXT_PUBLIC_ prefix needed
});

export async function POST(req: Request) {
  try {
    const { messages, voice, speed, text } = await req.json();
    
    // Handle different types of OpenAI requests
    if (messages) {
      // Chat completion
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
      });
      return NextResponse.json(response);
    }
    
    if (text && voice) {
      // Text-to-speech
      const response = await openai.audio.speech.create({
        model: "tts-1",
        input: text,
        voice: voice,
        speed: speed || 1.0,
      });
      
      const audioBlob = await response.blob();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 