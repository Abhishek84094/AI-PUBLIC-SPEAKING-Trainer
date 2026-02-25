
export interface Transcription {
  text: string;
  speaker: 'user' | 'ai';
  timestamp: number;
}

export interface FeedbackItem {
  id: string;
  type: 'pace' | 'filler' | 'posture' | 'sentiment' | 'positive';
  message: string;
  timestamp: number;
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR'
}

export type PracticeMode = 'PUBLIC_SPEAKING' | 'INTERVIEW' | 'PRESENTATION';

export interface SessionMetrics {
  speechRate: number;
  pauseCount: number;
  fillerWords: number;
  eyeContactScore: number;
  postureScore: number;
  confidenceScore: number;
}

export interface SessionHistory {
  id: string;
  userEmail: string;
  date: string; // ISO string
  duration: number;
  score: number;
  type: 'live' | 'upload';
  title: string;
  mode: PracticeMode;
  metrics: SessionMetrics;
  feedback?: FeedbackItem[];
  report?: string;
  transcriptions?: Transcription[];
  videoUrl?: string; // URL pointing to the recorded video blob
}

export interface User {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
}

export type AppView = 'AUTH' | 'DASHBOARD' | 'LIVE' | 'UPLOAD' | 'ANALYTICS' | 'LIBRARY';
