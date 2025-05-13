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
    
    // Create a Blob for the API request
    const blob = new Blob([buffer], { type: audioFile.type });
    
    // Call OpenAI's API to transcribe the audio
    const response = await openai.audio.transcriptions.create({
      file: blob,
      model: 'whisper-1',
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