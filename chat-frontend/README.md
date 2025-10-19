# AI Agent Chat Frontend

A modern, real-time chat interface for interacting with the AI Agent that monitors your screen activity.

## Features

- 💬 Real-time chat with AI agent
- 🔄 Live message updates using HTTP long-polling
- 🧠 Context-aware responses based on screen monitoring
- 💾 Persistent chat sessions
- 🎨 Clean, modern UI with smooth animations
- 📱 Responsive design

## Prerequisites

- Node.js 16+ and npm
- Backend server running on `http://localhost:3000`

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3001`

## Build

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Architecture

### Components

- **App.tsx**: Main application component that manages session initialization
- **ChatInterface.tsx**: Core chat UI component with message display and input
- **api.ts**: API service layer for backend communication

### Communication

The frontend uses HTTP long-polling to maintain real-time communication with the backend:

1. User sends a message via POST request
2. Backend processes the message and generates AI response
3. Frontend polls for new messages using GET requests with 30-second timeout
4. When new messages arrive, they're immediately displayed
5. Polling automatically reconnects on errors

### State Management

Uses React hooks for state management:
- `useState` for messages, loading states, and errors
- `useEffect` for lifecycle management and polling
- `useRef` for scroll management and cleanup

## API Endpoints

- `POST /api/chat/session` - Create new chat session
- `GET /api/chat/sessions` - Get all sessions
- `GET /api/chat/session/:sessionId/messages` - Get message history
- `POST /api/chat/session/:sessionId/message` - Send message
- `GET /api/chat/session/:sessionId/poll` - Long-poll for updates

## Session Management

Chat sessions are persisted in `localStorage`:
- Sessions are automatically created on first visit
- Returning users continue their existing session
- New sessions can be created via the "+" button

## Styling

Custom CSS with:
- Gradient backgrounds
- Smooth animations
- Responsive design
- Custom scrollbars
- Loading indicators
- Typing animations

