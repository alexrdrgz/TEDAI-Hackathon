# Local Speech-to-Speech Service

This directory contains the local speech service using:
- **Faster Whisper** for Speech-to-Text (STT)
- **pyttsx3** for Text-to-Speech (TTS)

No cloud services or API keys required! Perfect for hackathons.

## Prerequisites

### macOS
```bash
# Install PortAudio (required for PyAudio)
brew install portaudio

# Install FFmpeg (required for audio format conversion)
brew install ffmpeg
```

### Ubuntu/Debian
```bash
# Install PortAudio and FFmpeg
sudo apt-get update
sudo apt-get install portaudio19-dev ffmpeg python3-dev
```

### Windows
1. Download and install PortAudio from: http://www.portaudio.com/
2. Install FFmpeg from: https://ffmpeg.org/download.html

## Setup

1. Navigate to the speech_service directory:
```bash
cd backend/speech_service
```

2. Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Create a Python virtual environment
- Install all required dependencies
- Download the Whisper model (on first use)

## Testing the Service

### Test Speech-to-Text
```bash
# Activate virtual environment
source venv/bin/activate

# Test with an audio file
python3 stt.py /path/to/audio/file.wav
```

### Test Text-to-Speech
```bash
# Activate virtual environment
source venv/bin/activate

# Generate speech from text
python3 tts.py "Hello, this is a test" output.wav
```

### List Available Voices
```bash
# Activate virtual environment
source venv/bin/activate

# List all TTS voices on your system
python3 list_voices.py
```

## Configuration

### Whisper Model Size
Edit `backend/.env` and set:
```env
WHISPER_MODEL=base  # Options: tiny, base, small, medium, large-v2
```

Model sizes and performance:
- **tiny**: Fastest, least accurate, ~75MB
- **base**: Good balance, ~150MB (recommended for hackathons)
- **small**: Better accuracy, ~500MB
- **medium**: High accuracy, ~1.5GB
- **large-v2**: Best accuracy, ~3GB

### TTS Voice Selection
1. List available voices:
```bash
source venv/bin/activate
python3 list_voices.py
```

2. Set the voice index in `backend/.env`:
```env
TTS_VOICE_INDEX=0  # Use the index from list_voices.py
TTS_RATE=150       # Speech rate (words per minute)
TTS_VOLUME=1.0     # Volume (0.0 to 1.0)
```

## Troubleshooting

### PyAudio Installation Failed
If `pip install PyAudio` fails:

**macOS:**
```bash
brew install portaudio
pip install --global-option='build_ext' --global-option='-I/opt/homebrew/include' --global-option='-L/opt/homebrew/lib' pyaudio
```

**Ubuntu/Debian:**
```bash
sudo apt-get install portaudio19-dev
pip install pyaudio
```

### Model Download is Slow
The first time you run Faster Whisper, it downloads the model. This can take a few minutes depending on your internet speed. The model is cached locally for future use.

### No Voices Available
If `list_voices.py` shows no voices:

**macOS:** The system has built-in voices (should work out of the box)

**Ubuntu/Debian:**
```bash
sudo apt-get install espeak
```

**Windows:** Install Windows Speech Platform

### Audio Format Not Supported
Faster Whisper supports: WAV, MP3, OGG, WEBM, MP4, FLAC, etc.

If you get format errors, install FFmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg
```

## Performance Tips

1. **Use appropriate Whisper model**: 
   - For hackathon demos: `base` or `small`
   - For production: `medium` or `large-v2`
   - For quick prototyping: `tiny`

2. **GPU Acceleration** (if available):
   Edit `backend/.env`:
   ```env
   WHISPER_DEVICE=cuda
   ```

3. **Audio Quality**: Higher quality audio = better transcription
   - Minimize background noise
   - Use a good microphone
   - Speak clearly

## Files

- `requirements.txt` - Python dependencies
- `setup.sh` - Setup script
- `stt.py` - Speech-to-Text using Faster Whisper
- `tts.py` - Text-to-Speech using pyttsx3
- `list_voices.py` - List available TTS voices
- `venv/` - Python virtual environment (created by setup.sh)

## Cost

✅ **100% FREE!**
- No API keys required
- No cloud costs
- Runs entirely locally
- Perfect for hackathons and offline demos

## Comparison: Local vs Cloud

### Local (This Implementation)
- ✅ Free
- ✅ Works offline
- ✅ No API rate limits
- ✅ Privacy (data never leaves your machine)
- ❌ Requires initial setup
- ❌ Model download size
- ❌ Slower on CPU (fast on GPU)

### Cloud (Google Cloud, OpenAI)
- ❌ Costs money
- ❌ Requires internet
- ❌ API rate limits
- ❌ Data sent to cloud
- ✅ No local setup
- ✅ No storage required
- ✅ Fast and consistent

For hackathons, the local approach is usually better!

