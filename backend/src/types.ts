import { LanguageCode, User, Room } from '../../shared/src/types';

export interface RoomState {
  room: Room;
  openAISessions: {
    session1?: any; // OpenAI Realtime API session (Swedish→English)
    session2?: any; // OpenAI Realtime API session (English→Swedish)
  };
}

export interface ConnectionContext {
  userId: string;
  roomId: string;
  language: LanguageCode;
  ws: any;
}

