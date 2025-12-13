import { Room, User } from '../../shared/src/types';
import { RoomState } from './types';

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private userToRoom: Map<string, string> = new Map(); // userId -> roomId

  createRoom(roomId: string): RoomState {
    const room: Room = {
      id: roomId,
      users: [],
      createdAt: Date.now(),
    };

    const roomState: RoomState = {
      room,
      openAISessions: {},
    };

    this.rooms.set(roomId, roomState);
    return roomState;
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  addUserToRoom(roomId: string, user: User): boolean {
    const roomState = this.rooms.get(roomId);
    if (!roomState) {
      return false;
    }

    // Check if room is full (max 2 users)
    if (roomState.room.users.length >= 2) {
      return false;
    }

    // Check if user is already in the room
    if (roomState.room.users.some(u => u.id === user.id)) {
      return true; // Already in room
    }

    roomState.room.users.push(user);
    this.userToRoom.set(user.id, roomId);
    return true;
  }

  removeUser(userId: string): void {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) {
      return;
    }

    const roomState = this.rooms.get(roomId);
    if (!roomState) {
      return;
    }

    // Remove user from room
    roomState.room.users = roomState.room.users.filter(u => u.id !== userId);
    this.userToRoom.delete(userId);

    // If room is empty, clean it up
    if (roomState.room.users.length === 0) {
      // Clean up OpenAI sessions
      if (roomState.openAISessions.session1) {
        try {
          roomState.openAISessions.session1.close();
        } catch (e) {
          console.error('Error closing session1:', e);
        }
      }
      if (roomState.openAISessions.session2) {
        try {
          roomState.openAISessions.session2.close();
        } catch (e) {
          console.error('Error closing session2:', e);
        }
      }
      this.rooms.delete(roomId);
    }
  }

  getUserRoom(userId: string): RoomState | undefined {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) {
      return undefined;
    }
    return this.rooms.get(roomId);
  }

  isRoomFull(roomId: string): boolean {
    const roomState = this.rooms.get(roomId);
    if (!roomState) {
      return false;
    }
    return roomState.room.users.length >= 2;
  }

  getOtherUser(userId: string): User | undefined {
    const roomState = this.getUserRoom(userId);
    if (!roomState) {
      return undefined;
    }
    return roomState.room.users.find(u => u.id !== userId);
  }
}

