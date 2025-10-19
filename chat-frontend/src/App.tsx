import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import { createSession } from './services/api';
import './App.css';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Check if there's a stored session ID
        const storedSessionId = localStorage.getItem('chatSessionId');
        
        if (storedSessionId) {
          setSessionId(storedSessionId);
        } else {
          // Create new session
          const newSessionId = await createSession();
          localStorage.setItem('chatSessionId', newSessionId);
          setSessionId(newSessionId);
        }
        setError(null);
      } catch (err: any) {
        setError('Failed to initialize chat session');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  const handleNewSession = async () => {
    try {
      setIsLoading(true);
      const newSessionId = await createSession();
      localStorage.setItem('chatSessionId', newSessionId);
      setSessionId(newSessionId);
      setError(null);
    } catch (err: any) {
      setError('Failed to create new session');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing AI Agent...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <div className="error-icon">⚠️</div>
        <h2>Connection Error</h2>
        <p>{error}</p>
        <button className="retry-button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      {sessionId && <ChatInterface sessionId={sessionId} />}
      <button className="new-session-button" onClick={handleNewSession} title="Start new session">
        ➕
      </button>
    </div>
  );
}

export default App;

