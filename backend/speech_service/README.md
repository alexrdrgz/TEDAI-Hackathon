# Speech Service

Local speech-to-speech using:
- **Faster Whisper** - Speech-to-Text (offline)
- **pyttsx3** - Text-to-Speech (offline)

## Setup

```bash
./setup.sh
```

## Configuration

Edit `backend/.env`:
```env
WHISPER_MODEL=base        # tiny, base, small, medium, large-v2
TTS_VOICE_INDEX=132       # Mac: 132=Samantha (female)
TTS_RATE=175             # Speech rate (words per minute)
```

## List Voices

```bash
source venv/bin/activate
python3 list_voices.py
```

## Test

```bash
source venv/bin/activate
python3 stt.py audio.wav                    # Transcribe
python3 tts.py "Hello world" output.wav     # Generate speech
```

