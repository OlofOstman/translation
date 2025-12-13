import { useState } from 'react';
import { LanguageCode } from '../../shared/src/types';
import LanguageSelector from './components/LanguageSelector';
import RoomConnection from './components/RoomConnection';
import TranslationSession from './components/TranslationSession';

type AppState = 'language-selection' | 'room-connection' | 'translation-session';

function App() {
  const [state, setState] = useState<AppState>('language-selection');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const [roomId, setRoomId] = useState<string>('');

  const handleLanguageSelected = (language: LanguageCode) => {
    setSelectedLanguage(language);
    setState('room-connection');
  };

  const handleRoomConnected = (room: string) => {
    setRoomId(room);
    setState('translation-session');
  };

  const handleDisconnect = () => {
    setState('language-selection');
    setSelectedLanguage(null);
    setRoomId('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Live Translation</h1>
      </header>
      <main className="app-main">
        {state === 'language-selection' && (
          <LanguageSelector onLanguageSelected={handleLanguageSelected} />
        )}
        {state === 'room-connection' && selectedLanguage && (
          <RoomConnection
            language={selectedLanguage}
            onConnected={handleRoomConnected}
            onBack={() => setState('language-selection')}
          />
        )}
        {state === 'translation-session' && selectedLanguage && roomId && (
          <TranslationSession
            language={selectedLanguage}
            roomId={roomId}
            onDisconnect={handleDisconnect}
          />
        )}
      </main>
    </div>
  );
}

export default App;

