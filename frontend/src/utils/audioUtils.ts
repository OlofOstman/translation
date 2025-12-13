// Audio format: PCM16, 24kHz, Mono

const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export function convertFloat32ToPCM16(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return buffer;
}

export function resampleAudio(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Float32Array {
  const sourceSampleRate = audioBuffer.sampleRate;
  const targetLength = Math.round(
    (audioBuffer.length * targetSampleRate) / sourceSampleRate
  );
  const sourceData = audioBuffer.getChannelData(0);
  const targetData = new Float32Array(targetLength);
  
  const ratio = sourceSampleRate / targetSampleRate;
  let sourceIndex = 0;
  
  for (let i = 0; i < targetLength; i++) {
    const exactIndex = i * ratio;
    const index = Math.floor(exactIndex);
    const fraction = exactIndex - index;
    
    if (index + 1 < sourceData.length) {
      targetData[i] =
        sourceData[index] * (1 - fraction) + sourceData[index + 1] * fraction;
    } else {
      targetData[i] = sourceData[index];
    }
  }
  
  return targetData;
}

export async function getAudioStream(): Promise<MediaStream> {
  try {
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: CHANNELS,
        sampleRate: SAMPLE_RATE,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return stream;
  } catch (error: any) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('Microphone permission denied. Please allow microphone access in your browser settings and try again.');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      throw new Error('No microphone found. Please connect a microphone and try again.');
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      throw new Error('Microphone is already in use by another application. Please close other apps using the microphone and try again.');
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      throw new Error('Microphone does not support the required settings. Trying with default settings...');
    } else {
      throw new Error(`Failed to access microphone: ${error.message || error.name || 'Unknown error'}`);
    }
  }
}

export async function checkMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { granted: false, error: 'Microphone access is not supported in this browser' };
    }

    // Try to get permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just wanted to check permission
    stream.getTracks().forEach(track => track.stop());
    return { granted: true };
  } catch (error: any) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return { granted: false, error: 'Microphone permission denied. Click "Request Microphone Access" to enable it.' };
    }
    return { granted: false, error: error.message || 'Failed to check microphone permission' };
  }
}

