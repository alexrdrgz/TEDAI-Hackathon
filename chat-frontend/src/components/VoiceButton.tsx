import React from 'react';
import { VoiceState } from '../hooks/useVoiceMode';

interface VoiceButtonProps {
  state: VoiceState;
  onClick: () => void;
  disabled?: boolean;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({ state, onClick, disabled = false }) => {
  const getButtonContent = () => {
    switch (state) {
      case 'recording':
        return {
          icon: '⏹️',
          text: 'Stop Recording',
          className: 'recording',
        };
      case 'processing':
        return {
          icon: '⏳',
          text: 'Processing...',
          className: 'processing',
        };
      case 'speaking':
        return {
          icon: '🔊',
          text: 'AI Speaking...',
          className: 'speaking',
        };
      case 'error':
        return {
          icon: '⚠️',
          text: 'Error - Retry',
          className: 'error',
        };
      default:
        return {
          icon: '🎤',
          text: 'Start Speaking',
          className: 'idle',
        };
    }
  };

  const { icon, text, className } = getButtonContent();

  return (
    <button
      className={`voice-button ${className}`}
      onClick={onClick}
      disabled={disabled || state === 'processing'}
      aria-label={text}
    >
      <span className="voice-button-icon">{icon}</span>
      <span className="voice-button-text">{text}</span>
    </button>
  );
};

export default VoiceButton;

