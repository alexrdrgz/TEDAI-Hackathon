import React from 'react';
import { ChatInterface } from './components';
import './styles.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <div className="header">
        <h1>TEDAI AI Agent</h1>
        <p className="subtitle">Your Proactive AI Assistant</p>
      </div>
      <div className="content">
        <ChatInterface />
      </div>
    </div>
  );
};

export default App;

