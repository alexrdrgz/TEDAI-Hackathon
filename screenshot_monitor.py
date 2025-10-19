#!/usr/bin/env python3
import keyboard
import requests
import sys

API_URL = "http://localhost:3030/api/monitor/screenshot"
STREAMING_URL = "http://localhost:3030/api/monitor/streaming"

def send_screenshot_request():
    """Send GET request to screenshot endpoint"""
    try:
        response = requests.get(API_URL, timeout=30)
        print(f"✓ Request sent - Status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to server")
    except Exception as e:
        print(f"✗ Error: {e}")

def turn_streaming_on():
    """Turn streaming on"""
    try:
        response = requests.get(f"{STREAMING_URL}?on=true", timeout=5)
        print(f"✓ Streaming ON - Status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to server")
    except Exception as e:
        print(f"✗ Error: {e}")

def turn_streaming_off():
    """Turn streaming off"""
    try:
        response = requests.get(f"{STREAMING_URL}?on=false", timeout=5)
        print(f"✓ Streaming OFF - Status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to server")
    except Exception as e:
        print(f"✗ Error: {e}")

def on_screenshot_hotkey():
    """Callback for screenshot hotkey"""
    print("Screenshot hotkey pressed - sending request...")
    send_screenshot_request()

def on_streaming_on_hotkey():
    """Callback for streaming on hotkey"""
    print("Streaming ON hotkey pressed...")
    turn_streaming_on()

def on_streaming_off_hotkey():
    """Callback for streaming off hotkey"""
    print("Streaming OFF hotkey pressed...")
    turn_streaming_off()

if __name__ == "__main__":
    print("Screenshot Monitor Active")
    print("Press CTRL+ALT+S to send screenshot request")
    print("Press CTRL+ALT+I to turn streaming ON")
    print("Press CTRL+ALT+O to turn streaming OFF")
    print("Press ESC to exit\n")
    
    # Register hotkeys
    keyboard.add_hotkey("ctrl+alt+s", on_screenshot_hotkey)
    keyboard.add_hotkey("ctrl+alt+i", on_streaming_on_hotkey)
    keyboard.add_hotkey("ctrl+alt+o", on_streaming_off_hotkey)
    
    try:
        keyboard.wait("esc")
    except KeyboardInterrupt:
        pass
    finally:
        print("\nExiting...")
        sys.exit(0)
