import React, { useState, useEffect, useRef } from 'react';
import { Message, sendMessage, getMessages, startPolling, sendVoiceMessage } from '../services/api';
import { useVoiceMode } from '../hooks/useVoiceMode';
import VoiceButton from './VoiceButton';
import VoiceModeToggle from './VoiceModeToggle';
import './ChatInterface.css';
import './VoiceMode.css';

interface ChatInterfaceProps {
  sessionId: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);

  // Voice mode hook
  const voice = useVoiceMode({
    onError: (err) => {
      setError(err);
    },
  });

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages and start polling
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsInitialLoad(true);
        const initialMessages = await getMessages(sessionId);
        setMessages(initialMessages);
        setError(null);

        // Start polling for new messages
        const lastMessageId = initialMessages.length > 0 
          ? Math.max(...initialMessages.map(m => m.id)) 
          : 0;

        stopPollingRef.current = startPolling(
          sessionId,
          lastMessageId,
          (newMessages) => {
            setMessages(prev => {
              // Avoid duplicates
              const existingIds = new Set(prev.map(m => m.id));
              const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
              return [...prev, ...uniqueNewMessages];
            });
          },
          (err) => {
            console.error('Polling error:', err);
          }
        );
      } catch (err: any) {
        setError('Failed to load messages');
        console.error(err);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadMessages();

    // Cleanup: stop polling when component unmounts
    return () => {
      if (stopPollingRef.current) {
        stopPollingRef.current();
      }
    };
  }, [sessionId]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // The API will return the response, but polling will catch the messages
      await sendMessage(sessionId, userMessage);
    } catch (err: any) {
      setError('Failed to send message');
      console.error(err);
      // Restore input on error
      setInputValue(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = async (enabled: boolean) => {
    if (enabled && !voice.hasPermission) {
      const granted = await voice.requestMicrophonePermission();
      if (!granted) {
        return;
      }
    }
    setIsVoiceMode(enabled);
    setError(null);
  };

  const handleVoiceButtonClick = async () => {
    if (voice.isRecording) {
      // Stop recording and send
      const audioBlob = await voice.stopRecording();
      if (!audioBlob) {
        setError('Failed to record audio');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Send voice message
        const result = await sendVoiceMessage(sessionId, audioBlob);
        
        // Convert base64 audio to blob (WAV format from local TTS)
        const audioBytes = atob(result.audio);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
          audioArray[i] = audioBytes.charCodeAt(i);
        }
        const responseAudioBlob = new Blob([audioArray], { type: 'audio/wav' });

        // Play AI response
        await voice.playAudio(responseAudioBlob);
      } catch (err: any) {
        console.error('Voice message error:', err);
        setError(err.message || 'Failed to process voice message');
      } finally {
        setIsLoading(false);
      }
    } else if (voice.isSpeaking) {
      // Interrupt AI speaking
      voice.stopAudio();
    } else {
      // Start recording
      await voice.startRecording();
    }
  };

  if (isInitialLoad) {
    return (
      <div className="chat-container">
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <h2>AI Agent Assistant</h2>
          <p className="session-id">Session: {sessionId.substring(0, 8)}...</p>
        </div>
        <VoiceModeToggle
          isVoiceMode={isVoiceMode}
          onToggle={handleVoiceToggle}
          disabled={isLoading}
        />
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Start a conversation</h3>
            <p>Ask me anything! I have access to your recent screen activity.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-time">
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message assistant-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      {!isVoiceMode ? (
        <div className="input-container">
          <textarea
            className="message-input"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            rows={1}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
      ) : (
        <div className="voice-input-container">
          <VoiceButton
            state={voice.state}
            onClick={handleVoiceButtonClick}
            disabled={isLoading && voice.state === 'processing'}
          />
          {voice.isRecording && (
            <div className="recording-indicator">
              <div className="pulse-dot"></div>
              <span>Listening...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;

