#!/usr/bin/env python3
"""
Monitor screen changes for 10 seconds, logging how different each frame is
from the initial screenshot.
Usage: python3 monitor_screen_changes.py
"""
import subprocess
import time
import os
import sys
from datetime import datetime
from PIL import ImageGrab

def run_script(script_name, *args):
    """Run a Python script and return its output."""
    result = subprocess.run(
        [sys.executable, script_name] + list(args),
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def main():
    script_dir = os.path.dirname(__file__)
    
    # Capture initial screenshot
    print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] Taking initial screenshot...")
    initial_path = run_script(os.path.join(script_dir, "get_screenshot.py"))
    print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] Initial: {initial_path}")
    print()
    
    # Loop for 10 seconds
    for i in range(60):
        time.sleep(1)
        diff_percent = run_script(
            os.path.join(script_dir, "get_screenshot_diff.py"),
            initial_path
        )
        elapsed = i + 1
        print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] {elapsed}s: {diff_percent}% different")

if __name__ == "__main__":
    main()
