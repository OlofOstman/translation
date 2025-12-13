import 'dotenv/config';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from './roomManager';
import { OpenAISession } from './openaiSession';
import { User, ClientMessage, ServerMessage, LanguageCode } from '../../shared/src/types';
import { ConnectionContext } from './types';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

const wss = new WebSocketServer({ port: PORT });
const roomManager = new RoomManager();

console.log(`WebSocket server listening on port ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  let context: ConnectionContext | null = null;

  console.log('New client connected');

  ws.on('message', async (data: WebSocket.Data) => {
    try {
      if (typeof data === 'string') {
        const message: ClientMessage = JSON.parse(data);
        await handleMessage(ws, message, context);
      } else if (Buffer.isBuffer(data)) {
        // Binary audio data
        handleAudioData(ws, data, context);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendMessage(ws, {
        type: 'error',
        message: 'Failed to process message',
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (context) {
      roomManager.removeUser(context.userId);
      console.log(`User ${context.userId} removed from room ${context.roomId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  async function handleMessage(
    ws: WebSocket,
    message: ClientMessage,
    currentContext: ConnectionContext | null
  ): Promise<void> {
    switch (message.type) {
      case 'connect': {
        if (!message.roomId || !message.language) {
          sendMessage(ws, {
            type: 'error',
            message: 'roomId and language are required',
          });
          return;
        }

        const userId = uuidv4();
        const roomId = message.roomId;
        const language = message.language as LanguageCode;

        // Get or create room
        let roomState = roomManager.getRoom(roomId);
        if (!roomState) {
          roomState = roomManager.createRoom(roomId);
          console.log(`Created new room: ${roomId}`);
        }

        // Check if room is full
        if (roomManager.isRoomFull(roomId)) {
          sendMessage(ws, {
            type: 'room_full',
            message: 'Room is full (maximum 2 users)',
          });
          return;
        }

        // Add user to room
        const user: User = {
          id: userId,
          language,
          ws,
        };

        const added = roomManager.addUserToRoom(roomId, user);
        if (!added) {
          sendMessage(ws, {
            type: 'error',
            message: 'Failed to join room',
          });
          return;
        }

        context = {
          userId,
          roomId,
          language,
          ws,
        };

        console.log(`User ${userId} (${language}) joined room ${roomId}`);

        sendMessage(ws, {
          type: 'connected',
          roomId,
          message: 'Connected to room',
        });

        // If room now has 2 users, set up OpenAI sessions
        const roomStateAfter = roomManager.getRoom(roomId);
        if (roomStateAfter && roomStateAfter.room.users.length === 2) {
          await setupOpenAISessions(roomStateAfter);
        }
        break;
      }

      case 'start_recording':
        if (!currentContext) {
          sendMessage(ws, {
            type: 'error',
            message: 'Not connected to a room',
          });
          return;
        }
        // Recording started - no action needed, just acknowledge
        break;

      case 'stop_recording':
        if (!currentContext) {
          sendMessage(ws, {
            type: 'error',
            message: 'Not connected to a room',
          });
          return;
        }
        // Commit audio to OpenAI session
        const roomState = roomManager.getRoom(currentContext.roomId);
        if (roomState) {
          const otherUser = roomManager.getOtherUser(currentContext.userId);
          if (otherUser) {
            // Find the session that translates from current user's language to other user's language
            const session = getSessionForTranslation(
              roomState,
              currentContext.language,
              otherUser.language
            );
            if (session) {
              session.commitAudio();
            }
          }
        }
        break;
    }
  }

  function handleAudioData(
    ws: WebSocket,
    audio: Buffer,
    currentContext: ConnectionContext | null
  ): void {
    if (!currentContext) {
      return;
    }

    const roomState = roomManager.getRoom(currentContext.roomId);
    if (!roomState) {
      return;
    }

    const otherUser = roomManager.getOtherUser(currentContext.userId);
    if (!otherUser) {
      return; // No other user in room yet
    }

    // Find the session that translates from current user's language to other user's language
    const session = getSessionForTranslation(
      roomState,
      currentContext.language,
      otherUser.language
    );

    if (session && session.isConnected()) {
      session.sendAudio(audio);
    }
  }

  function getSessionForTranslation(
    roomState: any,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): OpenAISession | undefined {
    // Determine which session to use based on translation direction
    // Session 1: first user's language → second user's language
    // Session 2: second user's language → first user's language
    
    const users = roomState.room.users;
    if (users.length !== 2) {
      return undefined;
    }

    const user1 = users[0];
    const user2 = users[1];

    if (sourceLanguage === user1.language && targetLanguage === user2.language) {
      return roomState.openAISessions.session1;
    } else if (sourceLanguage === user2.language && targetLanguage === user1.language) {
      return roomState.openAISessions.session2;
    }

    return undefined;
  }

  async function setupOpenAISessions(roomState: any): Promise<void> {
    const users = roomState.room.users;
    if (users.length !== 2) {
      return;
    }

    const user1 = users[0];
    const user2 = users[1];

    console.log(`Setting up OpenAI sessions for room ${roomState.room.id}`);
    console.log(`  Session 1: ${user1.language} → ${user2.language}`);
    console.log(`  Session 2: ${user2.language} → ${user1.language}`);

    // Create session 1: user1 language → user2 language
    const session1 = new OpenAISession(
      OPENAI_API_KEY!,
      user1.language,
      user2.language,
      (audio: Buffer) => {
        // Send translated audio to user2
        sendMessage(user2.ws, {
          type: 'translated_audio',
          data: audio,
        });
      },
      (error: Error) => {
        console.error('Session 1 error:', error);
        sendMessage(user2.ws, {
          type: 'error',
          message: 'Translation error occurred',
        });
      }
    );

    // Create session 2: user2 language → user1 language
    const session2 = new OpenAISession(
      OPENAI_API_KEY!,
      user2.language,
      user1.language,
      (audio: Buffer) => {
        // Send translated audio to user1
        sendMessage(user1.ws, {
          type: 'translated_audio',
          data: audio,
        });
      },
      (error: Error) => {
        console.error('Session 2 error:', error);
        sendMessage(user1.ws, {
          type: 'error',
          message: 'Translation error occurred',
        });
      }
    );

    roomState.openAISessions.session1 = session1;
    roomState.openAISessions.session2 = session2;

    try {
      await Promise.all([session1.connect(), session2.connect()]);
      console.log('Both OpenAI sessions connected');

      // Notify both users that translation is ready
      sendMessage(user1.ws, {
        type: 'status',
        message: 'Translation ready',
      });
      sendMessage(user2.ws, {
        type: 'status',
        message: 'Translation ready',
      });
    } catch (error) {
      console.error('Failed to connect OpenAI sessions:', error);
      sendMessage(user1.ws, {
        type: 'error',
        message: 'Failed to initialize translation',
      });
      sendMessage(user2.ws, {
        type: 'error',
        message: 'Failed to initialize translation',
      });
    }
  }
});

function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    if (message.data) {
      // Send binary data
      ws.send(message.data);
    } else {
      // Send JSON message
      ws.send(JSON.stringify(message));
    }
  }
}

