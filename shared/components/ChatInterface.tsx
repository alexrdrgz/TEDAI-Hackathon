import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import apiClient from '../../chrome-extension/src/api';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      try {
        const id = await apiClient.createConversation();
        setConversationId(id);
      } catch (err) {
        setError('Failed to initialize conversation. Please refresh the page.');
        console.error('Error initializing conversation:', err);
      }
    };

    initConversation();
  }, []);

  // Load existing messages when conversation is created
  useEffect(() => {
    if (conversationId) {
      const loadMessages = async () => {
        try {
          const msgs = await apiClient.getMessages(conversationId);
          setMessages(msgs);
        } catch (err) {
          console.error('Error loading messages:', err);
        }
      };

      loadMessages();
    }
  }, [conversationId]);

  const handleSendMessage = async (content: string) => {
    if (!conversationId || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { userMessage, aiMessage } = await apiClient.sendMessage(
        conversationId,
        content
      );

      setMessages((prev) => [...prev, userMessage, aiMessage]);
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="chat-interface-loading">
        <div className="loading-spinner"></div>
        <p>Initializing chat...</p>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
};

