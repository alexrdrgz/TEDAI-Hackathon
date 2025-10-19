#!/usr/bin/env python3
"""
Speech-to-Text service using Faster Whisper
"""
import sys
import os
import json
from faster_whisper import WhisperModel

# Initialize model (you can change model size: tiny, base, small, medium, large-v2)
# For hackathon, 'base' is a good balance between speed and accuracy
MODEL_SIZE = os.environ.get('WHISPER_MODEL', 'base')
DEVICE = os.environ.get('WHISPER_DEVICE', 'cpu')  # Use 'cuda' if you have GPU

# Load model once at startup
print(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE}...", file=sys.stderr)
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type="int8")
print("✅ Whisper model loaded successfully", file=sys.stderr)

def transcribe_audio(audio_file_path):
    """
    Transcribe audio file to text using Faster Whisper
    """
    try:
        segments, info = model.transcribe(
            audio_file_path,
            beam_size=5,
            language="en",
            vad_filter=True,  # Voice Activity Detection
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        # Combine all segments into one text
        transcription = " ".join([segment.text for segment in segments])
        
        return {
            "success": True,
            "text": transcription.strip(),
            "language": info.language,
            "language_probability": info.language_probability
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python stt.py <audio_file_path>"
        }))
        sys.exit(1)
    
    audio_file = sys.argv[1]
    
    if not os.path.exists(audio_file):
        print(json.dumps({
            "success": False,
            "error": f"Audio file not found: {audio_file}"
        }))
        sys.exit(1)
    
    result = transcribe_audio(audio_file)
    print(json.dumps(result))

