import { CallStatus } from '@/lib/types';

export interface VoiceHistoryItem {
  id: string;
  date: Date;
  userMessage: string;
  aiResponse: string;
  audioUrl: string;
  voice: string;
}

export interface CallHistoryItem {
  id: string;
  phoneNumber: string;
  date: Date;
  duration: number;
  status: CallStatus;
  transcript: string;
  recording: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface HistoryStats {
  totalVoiceChats: number;
  totalCalls: number;
  totalDuration: number;
  averageDuration: number;
  successRate: number;
  voiceUsageBreakdown: {
    [key: string]: number;
  };
}
