# Voice Mode Setup

## Prerequisites

**Mac:**
```bash
brew install portaudio ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install portaudio19-dev ffmpeg python3-dev espeak
```

## Setup (One-time)

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Setup Python speech service
cd speech_service
chmod +x setup.sh
./setup.sh
cd ..

# 3. Configure environment
# Edit backend/.env and add:
GEMINI_API_KEY=your_key_here
TTS_VOICE_INDEX=132
```

## Run

**Terminal 1:**
```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"  # Mac only
npm run dev
```

**Terminal 2:**
```bash
cd chat-frontend
npm run dev
```

**Browser:** http://localhost:3001
- Click **Voice** toggle
- Click 🎤 to speak
- AI responds with voice

## Features
- 100% local, no API costs
- Works offline after setup
- Real-time interruption support

