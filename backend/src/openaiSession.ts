import WebSocket from 'ws';
import { LanguageCode } from '../../shared/src/types';

export class OpenAISession {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private sourceLanguage: LanguageCode;
  private targetLanguage: LanguageCode;
  private onAudioCallback?: (audio: Buffer) => void;
  private onErrorCallback?: (error: Error) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private isConnecting = false;

  constructor(
    apiKey: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    onAudio: (audio: Buffer) => void,
    onError?: (error: Error) => void
  ) {
    this.apiKey = apiKey;
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.onAudioCallback = onAudio;
    this.onErrorCallback = onError;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      // Connect directly to OpenAI Realtime API WebSocket
      // The API uses a specific endpoint format
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
      
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      this.ws.on('open', () => {
        console.log(`OpenAI session connected: ${this.sourceLanguage} → ${this.targetLanguage}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.setupSession();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error: Error) => {
        console.error('OpenAI WebSocket error:', error);
        this.isConnecting = false;
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
      });

      this.ws.on('close', () => {
        console.log(`OpenAI session closed: ${this.sourceLanguage} → ${this.targetLanguage}`);
        this.ws = null;
        this.isConnecting = false;
        
        // Attempt reconnection if not manually closed
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.connect().catch(err => {
              console.error('Reconnection failed:', err);
            });
          }, 1000 * this.reconnectAttempts);
        }
      });
    } catch (error) {
      this.isConnecting = false;
      console.error('Failed to create OpenAI session:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      throw error;
    }
  }

  private setupSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Set system prompt for translation-only behavior
    const systemPrompt = `You are a translation assistant. Your only job is to translate speech from ${this.getLanguageName(this.sourceLanguage)} to ${this.getLanguageName(this.targetLanguage)}. 

Rules:
- Only translate the speech, do not add any commentary, responses, or conversational elements
- Preserve the meaning, tone, and intent of the original speech
- Translate even if the grammar is imperfect
- Ignore background noise where possible
- Do not respond to questions or engage in conversation
- Only output the translation, nothing else`;

    const config = {
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions: systemPrompt,
        voice: 'alloy', // Default voice
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };

    this.ws.send(JSON.stringify(config));
  }

  private getLanguageName(code: LanguageCode): string {
    const languageMap: Record<LanguageCode, string> = {
      'sv': 'Swedish',
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'ko': 'Korean',
      'ar': 'Arabic',
    };
    return languageMap[code] || code;
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        this.handleJSONMessage(message);
      } else if (Buffer.isBuffer(data)) {
        // Binary audio data
        this.handleAudioData(data);
      }
    } catch (error) {
      console.error('Error handling OpenAI message:', error);
    }
  }

  private handleJSONMessage(message: any): void {
    // Handle different event types from OpenAI Realtime API
    if (message.type === 'response.audio_transcript.done') {
      // Transcription is done, audio translation should follow
      console.log('Transcription done, waiting for audio');
    } else if (message.type === 'response.audio.delta') {
      // Audio chunk received
      if (message.delta && this.onAudioCallback) {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(message.delta, 'base64');
        this.onAudioCallback(audioBuffer);
      }
    } else if (message.type === 'response.audio') {
      // Complete audio response
      if (message.audio && this.onAudioCallback) {
        const audioBuffer = Buffer.from(message.audio, 'base64');
        this.onAudioCallback(audioBuffer);
      }
    } else if (message.type === 'error') {
      console.error('OpenAI API error:', message.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(message.error?.message || 'OpenAI API error'));
      }
    } else if (message.type === 'session.created') {
      console.log('OpenAI session created');
    } else if (message.type === 'session.updated') {
      console.log('OpenAI session updated');
    }
  }

  private handleAudioData(data: Buffer): void {
    // Binary audio data from OpenAI
    if (this.onAudioCallback) {
      this.onAudioCallback(data);
    }
  }

  sendAudio(audio: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send audio to OpenAI Realtime API
    // Convert buffer to base64 for JSON message
    const base64Audio = audio.toString('base64');
    
    const message = {
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    };

    this.ws.send(JSON.stringify(message));
  }

  commitAudio(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Commit the audio buffer to trigger processing
    const message = {
      type: 'input_audio_buffer.commit',
    };

    this.ws.send(JSON.stringify(message));
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

