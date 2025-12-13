import { useRef, useEffect, useState, useCallback } from 'react';
import { ClientMessage, ServerMessage, LanguageCode } from '../../../shared/src/types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useWebSocket(
  roomId: string | null,
  language: LanguageCode | null,
  onTranslatedAudio: (audio: ArrayBuffer) => void
) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!roomId || !language) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setStatus('connecting');
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Send connection message
        const connectMessage: ClientMessage = {
          type: 'connect',
          roomId,
          language,
        };
        ws.send(JSON.stringify(connectMessage));
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          // JSON message
          try {
            const message: ServerMessage = JSON.parse(event.data);
            handleServerMessage(message);
          } catch (err) {
            console.error('Error parsing server message:', err);
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Binary audio data
          onTranslatedAudio(event.data);
        } else if (event.data instanceof Blob) {
          // Convert blob to ArrayBuffer
          event.data.arrayBuffer().then((buffer) => {
            onTranslatedAudio(buffer);
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setStatus('disconnected');
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Failed to reconnect. Please refresh the page.');
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setStatus('error');
    }
  }, [roomId, language, onTranslatedAudio]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendAudio = useCallback((audio: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audio);
    }
  }, []);

  const sendStartRecording = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        type: 'start_recording',
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendStopRecording = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        type: 'stop_recording',
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  function handleServerMessage(message: ServerMessage) {
    switch (message.type) {
      case 'connected':
        console.log('Connected to room:', message.roomId);
        setStatus('connected');
        break;
      case 'status':
        console.log('Status:', message.message);
        break;
      case 'error':
        console.error('Server error:', message.message);
        setError(message.message || 'Unknown error');
        break;
      case 'room_full':
        setError('Room is full (maximum 2 users)');
        setStatus('error');
        break;
      case 'room_not_found':
        setError('Room not found');
        setStatus('error');
        break;
    }
  }

  useEffect(() => {
    if (roomId && language) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [roomId, language, connect, disconnect]);

  return {
    status,
    error,
    sendAudio,
    sendStartRecording,
    sendStopRecording,
    connect,
    disconnect,
  };
}

