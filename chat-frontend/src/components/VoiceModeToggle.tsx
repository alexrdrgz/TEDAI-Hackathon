import React from 'react';

interface VoiceModeToggleProps {
  isVoiceMode: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

const VoiceModeToggle: React.FC<VoiceModeToggleProps> = ({ 
  isVoiceMode, 
  onToggle, 
  disabled = false 
}) => {
  return (
    <div className="voice-mode-toggle-container">
      <button
        className={`mode-button ${!isVoiceMode ? 'active' : ''}`}
        onClick={() => onToggle(false)}
        disabled={disabled || !isVoiceMode}
      >
        ⌨️ Text
      </button>
      <button
        className={`mode-button ${isVoiceMode ? 'active' : ''}`}
        onClick={() => onToggle(true)}
        disabled={disabled || isVoiceMode}
      >
        🎤 Voice
      </button>
    </div>
  );
};

export default VoiceModeToggle;

