# TEDAI Chat Interface Setup Guide

This guide will help you set up and test the chat interface with memory functionality.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Google Chrome browser
- Google Gemini API key (get one at https://makersuite.google.com/app/apikey)

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Configure environment variables
# Edit the .env file and add your Gemini API key
nano .env  # or use your preferred editor

# Add this line with your actual API key:
# GEMINI_API_KEY=your_actual_api_key_here

# Start the development server
npm run dev
```

The backend server will start on `http://localhost:3000`

### 2. Chrome Extension Setup

```bash
# Navigate to the chrome-extension directory
cd chrome-extension

# Install dependencies (if not already installed)
npm install

# Build the React app
npm run build
```

### 3. Load the Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **"Load unpacked"**
5. Select the `/path/to/TEDAI-Hackathon/chrome-extension` directory
6. The extension should now appear in your browser

## Testing the Chat Interface

### Test 1: Basic Chat Functionality

1. Click the TEDAI extension icon in your Chrome toolbar
2. Click the **"Open Page"** button in the popup
3. A new tab will open with the chat interface
4. Type a message in the input box and press Enter or click Send
5. You should see:
   - Your message appear in the chat
   - A loading indicator while the AI processes
   - The AI's response appear below your message

### Test 2: Conversation Memory

1. Start a conversation by asking: *"My name is John"*
2. Wait for the AI's response
3. Then ask: *"What is my name?"*
4. The AI should remember and respond with your name
5. Ask follow-up questions to test context retention

### Test 3: Multiple Messages

1. Send several messages in quick succession
2. Verify that all messages appear in order
3. Verify that the AI responds appropriately to each message
4. Check that timestamps are displayed correctly

### Test 4: Error Handling

1. Stop the backend server
2. Try sending a message
3. You should see an error banner at the top
4. Restart the backend and try again

### Test 5: Persistent Storage

1. Send a few messages
2. Close the chat tab
3. Open a new chat tab
4. Note that this creates a new conversation (as expected)
5. To verify database persistence, check the SQLite database:

```bash
cd backend/data
sqlite3 chat.db
.tables
SELECT * FROM conversations;
SELECT * FROM messages;
.exit
```

## API Endpoints

The backend exposes the following REST API endpoints:

- `POST /api/chat/conversations` - Create a new conversation
- `GET /api/chat/conversations/:id/messages` - Get all messages
- `POST /api/chat/conversations/:id/messages` - Send a message
- `GET /api/chat/conversations/:id/context` - Get conversation context
- `POST /api/chat/conversations/:id/context` - Save context data

## Development

### Running in Development Mode

**Backend:**
```bash
cd backend
npm run dev  # Auto-reloads on file changes
```

**Chrome Extension:**
```bash
cd chrome-extension
npm run dev  # Watches for changes and rebuilds
```

After making changes to the extension, click the reload button in `chrome://extensions/`

## Troubleshooting

### Backend won't start
- Check that port 3000 is not in use
- Verify that all dependencies are installed: `npm install`
- Check that the .env file exists and has your Gemini API key

### Extension won't load
- Make sure you've run `npm run build` in the chrome-extension directory
- Check that the dist folder exists with page.html and bundle.js
- Try removing and re-adding the extension

### Chat interface shows "Failed to initialize conversation"
- Verify the backend server is running on http://localhost:3000
- Check the browser console for CORS errors
- Test the API directly: `curl http://localhost:3000/api/hello`

### AI responses are not working
- Verify your Gemini API key is correctly set in backend/.env
- Check the backend console for API errors
- Ensure you have an active internet connection

### Messages not saving to database
- Check that the backend/data directory exists
- Verify SQLite is installed: `npm list better-sqlite3`
- Check file permissions on the data directory

## Architecture

### Backend Stack
- **Express.js** - REST API server
- **TypeScript** - Type-safe development
- **SQLite** - Persistent message storage
- **Google Gemini** - AI responses

### Frontend Stack
- **React 19** - UI components
- **TypeScript** - Type-safe development
- **Webpack** - Module bundling
- **Chrome Extension API** - Browser integration

### Data Flow
1. User types message in chat interface
2. React app sends message to backend via REST API
3. Backend saves message to SQLite database
4. Backend sends message + conversation history to Gemini
5. Gemini generates response
6. Backend saves AI response to database
7. Backend returns both messages to frontend
8. React app displays messages with smooth animations

## Next Steps

- Add user authentication
- Implement conversation list/history
- Add message editing and deletion
- Implement real-time updates with WebSockets
- Add file upload capabilities
- Implement voice input/output
- Add conversation export functionality

