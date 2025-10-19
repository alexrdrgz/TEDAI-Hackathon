#!/usr/bin/env python3
"""
Text-to-Speech service using pyttsx3
"""
import sys
import os
import json
import pyttsx3
import subprocess

def text_to_speech(text, output_file, rate=150, volume=1.0, voice_index=0):
    """
    Convert text to speech and save to file
    
    Args:
        text: Text to convert to speech
        output_file: Path to save the audio file
        rate: Speech rate (words per minute), default 150
        volume: Volume level (0.0 to 1.0), default 1.0
        voice_index: Voice to use (0 for first available), default 0
    """
    try:
        engine = pyttsx3.init()
        
        # Get available voices
        voices = engine.getProperty('voices')
        
        # Set voice (use index or default)
        if voices and voice_index < len(voices):
            engine.setProperty('voice', voices[voice_index].id)
        
        # Set rate and volume
        engine.setProperty('rate', rate)
        engine.setProperty('volume', volume)
        
        # Save to temporary AIFF file first (macOS default)
        temp_file = output_file.replace('.wav', '_temp.aiff')
        engine.save_to_file(text, temp_file)
        engine.runAndWait()
        
        # Convert AIFF to proper WAV format using ffmpeg (if available)
        try:
            # Try to convert with ffmpeg
            subprocess.run(
                ['ffmpeg', '-i', temp_file, '-acodec', 'pcm_s16le', '-ar', '22050', '-y', output_file],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            # Remove temp file
            if os.path.exists(temp_file):
                os.remove(temp_file)
        except (subprocess.CalledProcessError, FileNotFoundError):
            # ffmpeg not available or failed, just rename the AIFF file
            # Browsers might not play it, but at least we tried
            if os.path.exists(temp_file):
                os.rename(temp_file, output_file)
        
        return {
            "success": True,
            "output_file": output_file,
            "voice_used": voices[voice_index].name if voices and voice_index < len(voices) else "default"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python tts.py <text> <output_file> [rate] [volume] [voice_index]"
        }))
        sys.exit(1)
    
    text = sys.argv[1]
    output_file = sys.argv[2]
    rate = int(sys.argv[3]) if len(sys.argv) > 3 else 150
    volume = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    voice_index = int(sys.argv[5]) if len(sys.argv) > 5 else 0
    
    result = text_to_speech(text, output_file, rate, volume, voice_index)
    print(json.dumps(result))

