import { useState } from 'react';
import { LanguageCode, LANGUAGES } from '../../../shared/src/types';

interface RoomConnectionProps {
  language: LanguageCode;
  onConnected: (roomId: string) => void;
  onBack: () => void;
}

export default function RoomConnection({ language, onConnected, onBack }: RoomConnectionProps) {
  const [roomId, setRoomId] = useState('');
  const languageName = LANGUAGES.find((l) => l.code === language)?.name || language;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      onConnected(roomId.trim());
    }
  };

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(id);
  };

  return (
    <div className="room-connection">
      <h2>Join Room</h2>
      <p className="subtitle">You speak: <strong>{languageName}</strong></p>
      <form onSubmit={handleSubmit}>
        <div className="room-input-group">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Enter room ID"
            className="room-input"
            required
            maxLength={20}
          />
          <button
            type="button"
            onClick={generateRoomId}
            className="secondary-button"
          >
            Generate
          </button>
        </div>
        <div className="button-group">
          <button type="button" onClick={onBack} className="secondary-button">
            Back
          </button>
          <button type="submit" className="primary-button" disabled={!roomId.trim()}>
            Connect
          </button>
        </div>
      </form>
      <p className="help-text">
        Share the room ID with the other person. Both users need to enter the same room ID.
      </p>
    </div>
  );
}

