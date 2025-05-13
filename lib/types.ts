export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface VoiceSettings {
  model: string;
  voice: string;
  speed: number;
  pitch: number;
  stability: number;
  clarity: number;
}

export enum CallStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Call {
  id: string;
  userId: string;
  phoneNumber: string;
  status: CallStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recording?: string;
  transcript?: string;
  response?: string;
}

export interface ConversationMessage {
  id: string;
  callId: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
}

export interface SpeechGenerationResult {
  audioUrl: string;
  duration: number;
}