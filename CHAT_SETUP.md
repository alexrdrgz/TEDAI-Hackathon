# Chat Interface Setup Guide

This guide will help you set up and run the AI Agent Chat Interface with memory.

## Architecture Overview

The chat system consists of:

1. **Backend (Node.js + Express + TypeScript)**
   - RESTful API with long-polling
   - SQLite database for persistent storage
   - Gemini AI integration for intelligent responses
   - Context-aware responses using screen monitoring data

2. **Frontend (React + TypeScript + Vite)**
   - Standalone web application
   - Real-time message updates
   - Modern, intuitive UI
   - Session persistence

## Prerequisites

- Node.js 16+ and npm
- Gemini API key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 3. Start Backend Server

```bash
# Development mode with auto-reload
npm run dev
```

The backend will:
- Initialize SQLite database with required tables
- Start server on `http://localhost:3000`
- Create API endpoints at `/api/chat/*`

### Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/session` | Create new chat session |
| GET | `/api/chat/sessions` | Get all sessions |
| GET | `/api/chat/session/:sessionId/messages` | Get message history |
| POST | `/api/chat/session/:sessionId/message` | Send message and get AI response |
| GET | `/api/chat/session/:sessionId/poll` | Long-poll for real-time updates |

## Frontend Setup

### 1. Install Dependencies

```bash
cd chat-frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3001`

### 3. Build for Production

```bash
npm run build
npm run preview
```

## Database Schema

The system creates the following tables automatically:

### `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### `chat_messages`
```sql
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
)
```

## How It Works

### Real-Time Communication Flow

1. **Session Creation**
   - Frontend creates/loads session on startup
   - Session ID stored in localStorage
   - Backend creates database entry

2. **Sending Messages**
   - User types message in frontend
   - Frontend POSTs to `/api/chat/session/:sessionId/message`
   - Backend saves user message to database
   - Backend fetches recent screen monitoring context
   - Backend calls Gemini AI with conversation history + context
   - Backend saves AI response to database
   - Backend returns response to frontend

3. **Real-Time Updates (Long-Polling)**
   - Frontend continuously polls `/api/chat/session/:sessionId/poll`
   - Backend holds connection for up to 30 seconds
   - When new messages arrive, backend immediately responds
   - Frontend displays new messages and starts next poll
   - On timeout, frontend retries automatically

### Context-Aware Responses

The AI agent has access to:
- **Conversation History**: Full chat history for the session
- **Screen Snapshots**: Recent screenshots with descriptions
- **Timeline Entries**: Session activity timeline
- **User Context**: What the user was doing based on monitoring

This enables intelligent, context-aware suggestions and assistance.

## Features

### ✅ Implemented

- [x] Real-time bi-directional communication
- [x] Persistent chat sessions
- [x] Message history storage
- [x] Context-aware AI responses
- [x] Automatic reconnection on errors
- [x] Clean, modern UI
- [x] Loading states and animations
- [x] Error handling
- [x] Session management
- [x] Auto-scroll to latest messages

### 🎨 UI/UX Features

- Gradient-based design
- Typing indicators
- Message timestamps
- User/assistant avatar distinction
- Smooth animations
- Responsive layout
- Custom scrollbars

## Troubleshooting

### Backend Issues

**Database not created**
- Check that `backend/data/` directory exists
- Ensure write permissions

**Gemini API errors**
- Verify API key in `.env` file
- Check API key validity and quota
- Ensure internet connection

**CORS errors**
- Backend includes CORS middleware
- Check that both servers are running
- Verify frontend is using correct backend URL

### Frontend Issues

**Cannot connect to backend**
- Ensure backend is running on port 3000
- Check browser console for errors
- Verify proxy configuration in `vite.config.ts`

**Messages not updating**
- Check browser console for polling errors
- Verify session ID in localStorage
- Check network tab for failed requests

**npm install fails**
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`
- Try again: `npm install`

## Development Tips

### Testing the Chat

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd chat-frontend && npm run dev`
3. Open browser to `http://localhost:3001`
4. Send a test message like "Hello, what can you help me with?"

### Monitoring Requests

Use browser DevTools Network tab to see:
- POST requests when sending messages
- Long-polling GET requests
- Response payloads

### Database Inspection

SQLite database location: `backend/data/database.db`

Use SQLite CLI to inspect:
```bash
sqlite3 backend/data/database.db
.tables
SELECT * FROM chat_sessions;
SELECT * FROM chat_messages;
```

## Architecture Decisions

### Why HTTP Long-Polling?

- ✅ Simple to implement
- ✅ Works through firewalls/proxies
- ✅ No additional dependencies (unlike WebSockets)
- ✅ Reliable message delivery
- ✅ Automatic reconnection

### Why Standalone Frontend?

- ✅ Avoids merge conflicts with chrome-extension
- ✅ Can be deployed independently
- ✅ Easier testing and development
- ✅ Clean separation of concerns

### Why SQLite?

- ✅ Zero configuration
- ✅ File-based, portable
- ✅ Perfect for hackathon/prototype
- ✅ Easy to inspect and debug

## Next Steps

### Potential Enhancements

- [ ] Add message editing/deletion
- [ ] Support for markdown in messages
- [ ] File/image sharing
- [ ] Multiple concurrent sessions
- [ ] Export chat history
- [ ] Voice input/output
- [ ] Suggested prompts/actions
- [ ] Integration with screen monitoring UI
- [ ] Admin dashboard for analytics

## Support

For issues or questions, check:
- Browser console for frontend errors
- Terminal output for backend errors
- SQLite database for data verification
- Network tab for API issues

