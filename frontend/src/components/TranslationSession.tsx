import { useState, useCallback, useRef, useEffect } from 'react';
import { LanguageCode, LANGUAGES } from '../../../shared/src/types';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useWebSocket } from '../hooks/useWebSocket';
import { checkMicrophonePermission } from '../utils/audioUtils';

interface TranslationSessionProps {
  language: LanguageCode;
  roomId: string;
  onDisconnect: () => void;
}

export default function TranslationSession({
  language,
  roomId,
  onDisconnect,
}: TranslationSessionProps) {
  const [isPushingToTalk, setIsPushingToTalk] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting...');
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const languageName = LANGUAGES.find((l) => l.code === language)?.name || language;

  const handleTranslatedAudio = useCallback((audio: ArrayBuffer) => {
    // Queue audio for playback
    audioQueueRef.current.push(audio);
    playNextAudioChunk();
  }, []);

  const { status, error, sendAudio, sendStartRecording, sendStopRecording } = useWebSocket(
    roomId,
    language,
    handleTranslatedAudio
  );

  const { isRecording, error: audioError, startRecording, stopRecording } = useAudioCapture();

  // Update status message based on connection status
  useEffect(() => {
    switch (status) {
      case 'connecting':
        setStatusMessage('Connecting...');
        break;
      case 'connected':
        setStatusMessage('Waiting for other user...');
        break;
      case 'error':
        setStatusMessage(error || 'Connection error');
        break;
      default:
        setStatusMessage('Disconnected');
    }
  }, [status, error]);

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission().then(({ granted, error }) => {
      setMicPermissionGranted(granted);
      if (error) {
        setMicPermissionError(error);
      }
    });
  }, []);

  // Initialize audio context for playback
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  const playNextAudioChunk = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    if (!audioContextRef.current) {
      return;
    }

    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift()!;

    try {
      // Convert PCM16 to Float32Array
      const view = new DataView(audioBuffer);
      const float32Array = new Float32Array(audioBuffer.byteLength / 2);
      
      for (let i = 0; i < float32Array.length; i++) {
        const int16 = view.getInt16(i * 2, true);
        float32Array[i] = int16 / (int16 < 0 ? 0x8000 : 0x7FFF);
      }

      // Create AudioBuffer
      const buffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
      buffer.copyToChannel(float32Array, 0);

      // Create source and play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        isPlayingRef.current = false;
        // Play next chunk if available
        if (audioQueueRef.current.length > 0) {
          playNextAudioChunk();
        }
      };

      source.start();
    } catch (err) {
      console.error('Error playing audio:', err);
      isPlayingRef.current = false;
      // Try next chunk
      if (audioQueueRef.current.length > 0) {
        playNextAudioChunk();
      }
    }
  };

  const handleRequestMicrophoneAccess = useCallback(async () => {
    try {
      const { granted, error } = await checkMicrophonePermission();
      if (granted) {
        setMicPermissionGranted(true);
        setMicPermissionError(null);
      } else {
        setMicPermissionGranted(false);
        setMicPermissionError(error || 'Microphone permission denied');
      }
    } catch (err) {
      setMicPermissionGranted(false);
      setMicPermissionError('Failed to request microphone access');
    }
  }, []);

  const handlePushToTalkStart = useCallback(async () => {
    if (micPermissionGranted === false) {
      setMicPermissionError('Please grant microphone access first');
      return;
    }
    
    setIsPushingToTalk(true);
    sendStartRecording();
    try {
      await startRecording((audioChunk) => {
        sendAudio(audioChunk);
      });
      // If recording started successfully, permission is granted
      if (micPermissionGranted !== true) {
        setMicPermissionGranted(true);
        setMicPermissionError(null);
      }
    } catch (err) {
      setIsPushingToTalk(false);
      // Error will be shown via audioError state
      // Re-check permission in case it was denied
      const { granted } = await checkMicrophonePermission();
      setMicPermissionGranted(granted);
    }
  }, [startRecording, sendAudio, sendStartRecording, micPermissionGranted]);

  const handlePushToTalkEnd = useCallback(() => {
    setIsPushingToTalk(false);
    stopRecording();
    sendStopRecording();
  }, [stopRecording, sendStopRecording]);

  // Handle mouse events
  const handleMouseDown = () => {
    if (status === 'connected' && !isPushingToTalk) {
      handlePushToTalkStart();
    }
  };

  const handleMouseUp = () => {
    if (isPushingToTalk) {
      handlePushToTalkEnd();
    }
  };

  // Handle touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (status === 'connected' && !isPushingToTalk) {
      handlePushToTalkStart();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isPushingToTalk) {
      handlePushToTalkEnd();
    }
  };

  // Prevent default on window to handle mouse up outside button
  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (isPushingToTalk) {
        handlePushToTalkEnd();
      }
    };

    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPushingToTalk, handlePushToTalkEnd]);

  return (
    <div className="translation-session">
      <div className="session-header">
        <h2>Translation Session</h2>
        <p className="subtitle">You speak: <strong>{languageName}</strong></p>
        <p className="subtitle">Room: <strong>{roomId}</strong></p>
      </div>

      <div className="status-indicator">
        <div className={`status-dot ${status === 'connected' ? 'connected' : ''}`}></div>
        <span className="status-text">{statusMessage}</span>
      </div>

      {(error || audioError || micPermissionError) && (
        <div className="error-message">
          {error || audioError || micPermissionError}
          {micPermissionError && micPermissionGranted === false && (
            <div style={{ marginTop: '0.5rem' }}>
              <button
                onClick={handleRequestMicrophoneAccess}
                className="primary-button"
                style={{ marginTop: '0.5rem', width: 'auto', padding: '0.5rem 1rem' }}
              >
                Request Microphone Access
              </button>
            </div>
          )}
        </div>
      )}

      {micPermissionGranted === false && (
        <div className="permission-prompt">
          <p>Microphone access is required for translation.</p>
          <button
            onClick={handleRequestMicrophoneAccess}
            className="primary-button"
            style={{ marginTop: '1rem' }}
          >
            Request Microphone Access
          </button>
          <p className="help-text" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            If permission was denied, check your browser settings:
            <br />
            Chrome: Settings → Privacy → Site Settings → Microphone
            <br />
            Firefox: Preferences → Privacy → Permissions → Microphone
            <br />
            Safari: Preferences → Websites → Microphone
          </p>
        </div>
      )}

      <div className="push-to-talk-container">
        <button
          className={`push-to-talk-button ${isPushingToTalk ? 'active' : ''} ${status !== 'connected' || micPermissionGranted === false ? 'disabled' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={status !== 'connected' || micPermissionGranted === false}
        >
          {isPushingToTalk ? 'Listening...' : 'Push to Talk'}
        </button>
        <p className="help-text">
          {isPushingToTalk
            ? 'Speak now. Release when done.'
            : 'Hold the button and speak in your language'}
        </p>
      </div>

      <button onClick={onDisconnect} className="secondary-button disconnect-button">
        Disconnect
      </button>
    </div>
  );
}

