import { useRef, useCallback, useState } from 'react';
import { getAudioStream, resampleAudio, convertFloat32ToPCM16 } from '../utils/audioUtils';

const SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096; // ~170ms at 24kHz

export function useAudioCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const onAudioChunkRef = useRef<((chunk: ArrayBuffer) => void) | null>(null);
  const isRecordingRef = useRef(false);

  const startRecording = useCallback(
    async (onAudioChunk: (chunk: ArrayBuffer) => void) => {
      try {
        setError(null);
        onAudioChunkRef.current = onAudioChunk;

        // Get microphone stream
        const stream = await getAudioStream();
        mediaStreamRef.current = stream;

        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: SAMPLE_RATE,
        });
        audioContextRef.current = audioContext;

        // Create source node
        const sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;

        // Create script processor for capturing audio
        const processorNode = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
        processorNodeRef.current = processorNode;

        processorNode.onaudioprocess = (event) => {
          if (!isRecordingRef.current) {
            return;
          }

          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);

          // Resample if needed (audio context might use different sample rate)
          let processedData: Float32Array;
          if (audioContext.sampleRate !== SAMPLE_RATE) {
            // Create a temporary AudioBuffer for resampling
            const tempBuffer = audioContext.createBuffer(
              1,
              inputData.length,
              audioContext.sampleRate
            );
            tempBuffer.copyToChannel(inputData, 0);
            processedData = resampleAudio(tempBuffer, SAMPLE_RATE);
          } else {
            processedData = inputData;
          }

          // Convert to PCM16
          const pcm16Buffer = convertFloat32ToPCM16(processedData);

          // Send chunk
          if (onAudioChunkRef.current) {
            onAudioChunkRef.current(pcm16Buffer);
          }
        };

        // Connect nodes
        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);

        isRecordingRef.current = true;
        setIsRecording(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
        setError(errorMessage);
        console.error('Error starting recording:', err);
      }
    },
    [isRecording]
  );

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);

    // Disconnect and cleanup
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    onAudioChunkRef.current = null;
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}

