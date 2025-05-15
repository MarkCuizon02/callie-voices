import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client only on the server side
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    
    if (!messages?.length) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Validate message format
    const isValidMessage = (msg: any) => 
      msg && 
      typeof msg === 'object' && 
      ['user', 'assistant', 'system'].includes(msg.role) && 
      typeof msg.content === 'string';

    if (!messages.every(isValidMessage)) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No response generated');
    }

    return NextResponse.json({ 
      data: { message: reply }
    });
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}