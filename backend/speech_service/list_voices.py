#!/usr/bin/env python3
"""
List available TTS voices on the system
"""
import pyttsx3
import json

def list_voices():
    """List all available TTS voices"""
    try:
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        
        voice_list = []
        for i, voice in enumerate(voices):
            voice_list.append({
                "index": i,
                "id": voice.id,
                "name": voice.name,
                "languages": voice.languages if hasattr(voice, 'languages') else [],
                "gender": voice.gender if hasattr(voice, 'gender') else None
            })
        
        return {
            "success": True,
            "voices": voice_list,
            "count": len(voice_list)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    result = list_voices()
    print(json.dumps(result, indent=2))

