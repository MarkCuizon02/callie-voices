import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client only on the server side
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Get the form data with the audio file
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }
    
    // Convert the file to a format OpenAI can use
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Call OpenAI's API to transcribe the audio    
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'auto', // Auto language detection
      response_format: 'json',
      temperature: 0.2, // Lower temperature for more precise transcription
      prompt: 'Convert speech to text maintaining punctuation and formatting.'
    });
    
    // Return the transcription
    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}