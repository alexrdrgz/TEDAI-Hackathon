import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/chat.db');

// Initialize database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const initDatabase = () => {
  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'default_user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // Context memory table for storing additional context
  db.exec(`
    CREATE TABLE IF NOT EXISTS context_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation 
    ON messages(conversation_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_context_conversation 
    ON context_memory(conversation_id);
  `);

  console.log('Database initialized successfully');
};

// Initialize on module load
initDatabase();

// Database operations
export const createConversation = (userId: string = 'default_user') => {
  const stmt = db.prepare('INSERT INTO conversations (user_id) VALUES (?)');
  const result = stmt.run(userId);
  return result.lastInsertRowid as number;
};

export const getConversation = (conversationId: number) => {
  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
  return stmt.get(conversationId);
};

export const createMessage = (conversationId: number, role: 'user' | 'assistant', content: string) => {
  const stmt = db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  );
  const result = stmt.run(conversationId, role, content);
  
  // Update conversation timestamp
  const updateStmt = db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  updateStmt.run(conversationId);
  
  return result.lastInsertRowid as number;
};

export const getMessages = (conversationId: number) => {
  const stmt = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
  );
  return stmt.all(conversationId);
};

export const getConversationHistory = (conversationId: number) => {
  const messages = getMessages(conversationId);
  return messages.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp
  }));
};

export const saveContext = (conversationId: number, key: string, value: string) => {
  const stmt = db.prepare(
    'INSERT INTO context_memory (conversation_id, key, value) VALUES (?, ?, ?)'
  );
  return stmt.run(conversationId, key, value);
};

export const getContext = (conversationId: number) => {
  const stmt = db.prepare('SELECT key, value FROM context_memory WHERE conversation_id = ?');
  const results = stmt.all(conversationId) as Array<{ key: string; value: string }>;
  return results.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
};

export default db;

