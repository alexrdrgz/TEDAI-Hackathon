import { db } from './db';
import { randomUUID } from 'crypto';

export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: number;
  session_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new chat session
 */
export async function createSession(): Promise<string> {
  const sessionId = randomUUID();
  
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO chat_sessions (session_id) VALUES (?)',
      [sessionId],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(sessionId);
        }
      }
    );
  });
}

/**
 * Save a message to the database
 */
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)',
      [sessionId, role, content],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // Update session updated_at timestamp
          db.run(
            'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
            [sessionId],
            () => {} // Ignore errors for update
          );
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Get message history for a session
 */
export async function getSessionHistory(
  sessionId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, session_id, role, content, created_at 
       FROM chat_messages 
       WHERE session_id = ? 
       ORDER BY created_at ASC 
       LIMIT ?`,
      [sessionId, limit],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Get session with context (messages + metadata)
 */
export async function getSessionWithContext(sessionId: string): Promise<{
  session: ChatSession | null;
  messages: ChatMessage[];
}> {
  return new Promise((resolve, reject) => {
    // First get the session
    db.get(
      'SELECT id, session_id, created_at, updated_at FROM chat_sessions WHERE session_id = ?',
      [sessionId],
      async (err, session: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!session) {
          resolve({ session: null, messages: [] });
          return;
        }

        // Then get messages
        try {
          const messages = await getSessionHistory(sessionId);
          resolve({ session, messages });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Check if a session exists
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM chat_sessions WHERE session_id = ?',
      [sessionId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

/**
 * Get all sessions (for listing)
 */
export async function getAllSessions(): Promise<ChatSession[]> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, session_id, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC',
      [],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}
