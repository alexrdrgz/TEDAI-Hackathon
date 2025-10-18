# Quick Start Guide

Get the chat interface running in 5 minutes!

## Step 1: Get a Gemini API Key

1. Visit https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your API key

## Step 2: Configure Backend

```bash
cd backend
nano .env  # or use any text editor
```

Add your API key to the `.env` file:
```
GEMINI_API_KEY=your_actual_api_key_here
```

## Step 3: Start Backend

```bash
cd backend
npm run dev
```

You should see: `Server running on http://localhost:3000`

## Step 4: Load Chrome Extension

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Toggle on "Developer mode" (top right)
4. Click "Load unpacked"
5. Navigate to and select the `chrome-extension` folder

## Step 5: Test the Chat!

1. Click the TEDAI extension icon in Chrome toolbar
2. Click "Open Page" button
3. Type a message and press Enter
4. Watch the AI respond!

## Test Examples

Try these prompts to test the memory feature:

1. "My favorite color is blue"
2. "What is my favorite color?" ← Should remember!
3. "I work at TEDAI Hackathon"
4. "Where do I work?" ← Should remember!

## Troubleshooting

**Backend won't start?**
- Make sure you added your Gemini API key to `backend/.env`
- Check that port 3000 isn't in use

**Extension won't load?**
- Make sure the build completed: check for `chrome-extension/dist/` folder
- If it doesn't exist, run: `cd chrome-extension && npm run build`

**Chat shows error?**
- Make sure backend is running: `curl http://localhost:3000/api/hello`
- Check the browser console (F12) for errors

## Next Steps

- Read [SETUP.md](SETUP.md) for detailed testing scenarios
- Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for architecture details
- Explore the code to add new features!

## Features to Explore

- Message persistence (survives page reload)
- Context-aware responses
- Beautiful animations
- Error handling
- Loading indicators

Enjoy your AI chat interface! 🎉

