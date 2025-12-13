// Language codes and names
export const LANGUAGES = [
  { code: 'sv', name: 'Swedish' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];
export type LanguageName = typeof LANGUAGES[number]['name'];

// WebSocket message types from client to backend
export interface ClientMessage {
  type: 'connect' | 'audio' | 'start_recording' | 'stop_recording';
  roomId?: string;
  language?: LanguageCode;
  data?: ArrayBuffer;
}

// WebSocket message types from backend to client
export interface ServerMessage {
  type: 'connected' | 'translated_audio' | 'status' | 'error' | 'room_full' | 'room_not_found';
  roomId?: string;
  message?: string;
  data?: ArrayBuffer;
}

// Room and user state
export interface User {
  id: string;
  language: LanguageCode;
  ws: any; // WebSocket connection
}

export interface Room {
  id: string;
  users: User[];
  createdAt: number;
}

// OpenAI Realtime API event types (simplified)
export interface OpenAIEvent {
  type: string;
  [key: string]: any;
}

