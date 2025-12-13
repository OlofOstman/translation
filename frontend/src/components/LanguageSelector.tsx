import { useState } from 'react';
import { LANGUAGES, LanguageCode } from '../../../shared/src/types';

interface LanguageSelectorProps {
  onLanguageSelected: (language: LanguageCode) => void;
}

export default function LanguageSelector({ onLanguageSelected }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLanguage) {
      onLanguageSelected(selectedLanguage);
    }
  };

  return (
    <div className="language-selector">
      <h2>Select Your Language</h2>
      <p className="subtitle">Choose the language you will speak</p>
      <form onSubmit={handleSubmit}>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
          className="language-select"
          required
        >
          <option value="">-- Select Language --</option>
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
        <button type="submit" className="primary-button" disabled={!selectedLanguage}>
          Continue
        </button>
      </form>
    </div>
  );
}

