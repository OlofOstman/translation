# Live Translation App

A real-time two-person speech translation app using OpenAI's Realtime API. Enables users speaking different languages to communicate naturally with automatic bidirectional translation.

## Features

- 🎤 Real-time speech-to-speech translation
- 🌍 Support for multiple languages (Swedish, English, and more)
- 🎯 Push-to-talk interface for clear audio capture
- ⚡ Low-latency translation (<2 seconds target)
- 📱 Mobile-ready architecture (web app with easy iOS/Android porting)

## Architecture

```
translation/
├── frontend/     # React app with Vite
├── backend/      # Node.js WebSocket server
└── shared/       # Shared types and utilities
```

## Prerequisites

- Node.js 18+ 
- OpenAI API key with Realtime API access
- Modern browser with microphone support

## Setup

1. Clone the repository:
```bash
git clone https://github.com/Osten338/translation.git
cd translation
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the `backend/` directory:
```bash
cp backend/env.example backend/.env
```

4. Add your OpenAI API key to `backend/.env`:
```
OPENAI_API_KEY=sk-...
PORT=3001
```

## Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

This starts:
- Backend WebSocket server on port 3001
- Frontend dev server on port 3000

## Usage

1. Open http://localhost:3000 in two browser windows/tabs
2. Select your language in each window (e.g., Swedish in one, English in the other)
3. Click "Connect" to establish the translation session
4. Press and hold the "Push to Talk" button while speaking
5. Release the button to hear the translation

## How It Works

1. **Two Users**: Each user opens the app and selects their language
2. **WebSocket Connections**: Backend manages two client connections
3. **OpenAI Sessions**: Two OpenAI Realtime API sessions handle bidirectional translation
4. **Audio Routing**: Backend routes audio between clients and OpenAI sessions

```
User A (Swedish) ←→ Backend ←→ OpenAI (Swedish→English) ←→ Backend ←→ User B (English)
User B (English) ←→ Backend ←→ OpenAI (English→Swedish) ←→ Backend ←→ User A (Swedish)
```

## Technical Details

- **Audio Format**: PCM16, 24kHz, Mono
- **Transport**: WebSocket for low-latency streaming
- **Translation**: OpenAI Realtime API with strict translation-only prompts

## Future Enhancements

- Continuous listening (no push-to-talk)
- Automatic language detection
- Conversation transcript export
- Mobile apps (iOS/Android via React Native)
- Multi-user rooms

## License

MIT
