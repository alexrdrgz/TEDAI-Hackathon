import React from 'react';

export const LoadingIndicator: React.FC = () => {
  return (
    <div className="loading-indicator">
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="loading-text">AI is thinking...</span>
    </div>
  );
};

